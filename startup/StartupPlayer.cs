using System;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;
using System.Threading;
using System.Globalization;
using System.Security.Cryptography;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;

// Preview builds have no launch-app.txt. Only an approved installation writes that file.
internal static class StartupPlayer
{
    [STAThread]
    public static void Main(string[] args)
    {
        string appId = null, video = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "chatgpt-boot.mp4");
        string log = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "preview.log");
        bool autoClose = false, preview = false, customLog = false, inspect = false;
        for (int i = 0; i < args.Length; i++)
        {
            if (args[i] == "--app-id" && i + 1 < args.Length) appId = args[++i];
            else if (args[i] == "--video" && i + 1 < args.Length) video = Path.GetFullPath(args[++i]);
            else if (args[i] == "--log" && i + 1 < args.Length) { log = Path.GetFullPath(args[++i]); customLog = true; }
            else if (args[i] == "--auto-close") autoClose = true;
            else if (args[i] == "--preview") preview = true;
            else if (args[i] == "--inspect") inspect = true;
        }
        string targetFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "launch-app.txt");
        if (appId == null && !preview && File.Exists(targetFile)) appId = File.ReadAllText(targetFile).Trim();
        if (preview) appId = null;
        if (appId != null && !Regex.IsMatch(appId, @"^[A-Za-z0-9_.-]+![A-Za-z0-9_.-]+$"))
            throw new ArgumentException("Invalid Windows application identity.");
        if (appId != null && !customLog) log = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "startup.log");
        Mutex single = null; bool owns = false;
        try {
            if (appId != null) {
                single = new Mutex(false, @"Local\ChatGPTStartup." + appId.Replace('!', '.'));
                try { owns = single.WaitOne(0); } catch (AbandonedMutexException) { owns = true; }
                if (!owns) return;
            }
            var application = new Application();
            application.Run(new Splash(video, appId, log, autoClose, inspect));
        } finally { if (single != null) { if (owns) single.ReleaseMutex(); single.Dispose(); } }
    }
}

// Activate the registered package identity, which stays stable across client updates.
// Windows returns the PID of the application instance that handled this launch.
internal static class AppActivation
{
    [ComImport, Guid("2E941141-7F97-4756-BA1D-9DECDE894A3D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IApplicationActivationManager
    {
        [PreserveSig]
        int ActivateApplication([MarshalAs(UnmanagedType.LPWStr)] string appId,
            [MarshalAs(UnmanagedType.LPWStr)] string arguments, uint options, out uint processId);
    }
    public static uint Activate(string appId)
    {
        object instance = Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")));
        try {
            uint processId;
            int result = ((IApplicationActivationManager)instance).ActivateApplication(appId, null, 0, out processId);
            Marshal.ThrowExceptionForHR(result);
            return processId;
        } finally { Marshal.FinalReleaseComObject(instance); }
    }
}

internal sealed class Splash : Window
{
    readonly MediaElement media = new MediaElement();
    readonly MediaElement permissionIdle = new MediaElement();
    readonly DispatcherTimer guard = new DispatcherTimer();
    readonly Stopwatch clock = Stopwatch.StartNew();
    readonly string appId, logPath;
    readonly object logLock = new object();
    readonly Border cover = new Border();
    volatile bool activationFinished, activationSucceeded;
    bool activationStarted, handoffRequested, revealStarted, closing;
    long requestedAt, activatedAt;
    double videoSeconds=24.0;
    readonly Button permissionButton=new Button();
    readonly Canvas permissionLayer=new Canvas();
    bool permissionEnabled,permissionGranted,permissionWaiting;
    double permissionShow,permissionHold,permissionNext;
    long permissionWaitStarted,totalPermissionWait;
    string permissionIdlePath;
    bool permissionIdleReady;

    double ActiveSeconds() {
        long waiting=permissionWaiting?clock.ElapsedMilliseconds-permissionWaitStarted:0;
        return (clock.ElapsedMilliseconds-totalPermissionWait-waiting)/1000.0;
    }
    double ReadGateNumber(string json,string key) {
        return double.Parse(Regex.Match(json,"\""+key+"\"\\s*:\\s*([0-9.]+)").Groups[1].Value,CultureInfo.InvariantCulture);
    }
    void LoadPermission(string video) {
        try {
            string path=Path.ChangeExtension(video,"interaction.json");
            if(!File.Exists(path)||!File.Exists(video))return;
            string json=File.ReadAllText(path),expected=Regex.Match(json,"\"videoSHA256\"\\s*:\\s*\"([a-fA-F0-9]{64})\"").Groups[1].Value;
            string actual;
            using(var stream=File.OpenRead(video))using(var sha=SHA256.Create())actual=BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","");
            if(!actual.Equals(expected,StringComparison.OrdinalIgnoreCase))return;
            permissionShow=ReadGateNumber(json,"showAt");permissionHold=ReadGateNumber(json,"holdAt");permissionNext=ReadGateNumber(json,"nextAt");
            permissionEnabled=permissionShow>0&&permissionShow<permissionHold&&permissionHold<permissionNext;
            string idlePath=Path.Combine(Path.GetDirectoryName(video),"chatgpt-permission-idle.mp4");
            string idleExpected=Regex.Match(json,"\"idleSHA256\"\\s*:\\s*\"([a-fA-F0-9]{64})\"").Groups[1].Value;
            if(permissionEnabled&&File.Exists(idlePath)&&idleExpected.Length==64) {
                using(var stream=File.OpenRead(idlePath))using(var sha=SHA256.Create())actual=BitConverter.ToString(sha.ComputeHash(stream)).Replace("-","");
                if(actual.Equals(idleExpected,StringComparison.OrdinalIgnoreCase))permissionIdlePath=idlePath;
            }
        } catch(Exception ex) {Log("PERMISSION_CONFIG_IGNORED "+ex.Message);}
    }
    void LayoutPermission() {
        double scale=Math.Max(ActualWidth/1920.0,ActualHeight/1080.0);
        permissionButton.Width=264*scale;permissionButton.Height=48*scale;permissionButton.FontSize=16*scale;
        Canvas.SetLeft(permissionButton,(ActualWidth-1920*scale)/2+828*scale);
        Canvas.SetTop(permissionButton,(ActualHeight-1080*scale)/2+556*scale);
    }
    void EndPermissionWait() {
        if(permissionWaiting){totalPermissionWait+=clock.ElapsedMilliseconds-permissionWaitStarted;permissionWaiting=false;}
        permissionIdle.Pause();permissionIdle.BeginAnimation(OpacityProperty,null);permissionIdle.Opacity=0;
    }
    void StartPermissionIdle() {
        if(!permissionWaiting||!permissionIdleReady||handoffRequested)return;
        permissionIdle.Position=TimeSpan.Zero;permissionIdle.Play();
        permissionIdle.BeginAnimation(OpacityProperty,new System.Windows.Media.Animation.DoubleAnimation(0,1,TimeSpan.FromMilliseconds(100)));
        Log("PERMISSION_IDLE_STARTED");
    }
    void AcceptPermission() {
        if(!permissionEnabled||permissionGranted||permissionButton.Visibility!=Visibility.Visible||handoffRequested)return;
        EndPermissionWait();permissionGranted=true;permissionButton.Visibility=Visibility.Collapsed;Cursor=Cursors.None;
        media.Position=TimeSpan.FromSeconds(permissionNext);media.Play();
        Log("PERMISSION_GRANTED next="+permissionNext.ToString("F3",CultureInfo.InvariantCulture)+" waited_ms="+totalPermissionWait);
    }

    Brush Brush(string hex) { return (Brush)new BrushConverter().ConvertFromString(hex); }
    void Log(string message)
    {
        try { lock(logLock) File.AppendAllText(logPath, DateTime.Now.ToString("s") + " " + message + Environment.NewLine); }
        catch { }
    }
    public Splash(string video, string targetAppId, string log, bool closeOnEnd, bool inspect)
    {
        appId=targetAppId; logPath=log;
        LoadPermission(video);
        Title=appId==null ? "ChatGPT 启动动画 · 试听" : "ChatGPT · 启动序列";
        string iconPath=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"chatgpt.ico");
        if(File.Exists(iconPath)) Icon=BitmapFrame.Create(new Uri(iconPath));
        WindowStyle=WindowStyle.None; ResizeMode=ResizeMode.NoResize; ShowInTaskbar=inspect;
        WindowStartupLocation=WindowStartupLocation.Manual; Topmost=true; Cursor=Cursors.None;
        // Cover the primary monitor, including the taskbar area. WorkArea leaves
        // a shorter viewport, which adds side bars around the 16:9 movie.
        Left=0; Top=0; Width=SystemParameters.PrimaryScreenWidth; Height=SystemParameters.PrimaryScreenHeight;
        Background=Brush("#212121");
        var root=new Grid { Background=Brush("#212121"), ClipToBounds=true }; Content=root;
        media.LoadedBehavior=MediaState.Manual; media.UnloadedBehavior=MediaState.Close;
        media.Stretch=Stretch.UniformToFill; media.Volume=.85; media.Opacity=0;
        root.Children.Add(media);
        permissionIdle.LoadedBehavior=MediaState.Manual;permissionIdle.UnloadedBehavior=MediaState.Close;
        permissionIdle.Stretch=Stretch.UniformToFill;permissionIdle.IsMuted=true;permissionIdle.Opacity=0;permissionIdle.IsHitTestVisible=false;
        root.Children.Add(permissionIdle);
        permissionIdle.MediaOpened+=(s,e)=>{permissionIdle.Pause();permissionIdle.Position=TimeSpan.Zero;permissionIdleReady=true;Log("PERMISSION_IDLE_READY");StartPermissionIdle();};
        permissionIdle.MediaEnded+=(s,e)=>{if(permissionWaiting&&!handoffRequested){permissionIdle.Position=TimeSpan.Zero;permissionIdle.Play();Log("PERMISSION_IDLE_LOOP");}};
        permissionIdle.MediaFailed+=(s,e)=>{permissionIdleReady=false;permissionIdle.BeginAnimation(OpacityProperty,null);permissionIdle.Opacity=0;Log("PERMISSION_IDLE_FAILED "+e.ErrorException.Message);};
        cover.Background=Brush("#212121"); cover.Opacity=0; cover.IsHitTestVisible=false;
        root.Children.Add(cover);
        permissionButton.Content="申请访问许可  →";permissionButton.FontFamily=new FontFamily("Microsoft YaHei");
        permissionButton.Background=Brush("#eeeaf4");permissionButton.Foreground=Brush("#212121");permissionButton.BorderBrush=Brush("#c1a0df");permissionButton.BorderThickness=new Thickness(1);
        permissionButton.Cursor=Cursors.Hand;permissionButton.Visibility=Visibility.Collapsed;
        permissionButton.Style=(Style)System.Windows.Markup.XamlReader.Parse(@"<Style xmlns='http://schemas.microsoft.com/winfx/2006/xaml/presentation' TargetType='Button'><Setter Property='Template'><Setter.Value><ControlTemplate TargetType='Button'><Border Background='{TemplateBinding Background}' BorderBrush='{TemplateBinding BorderBrush}' BorderThickness='{TemplateBinding BorderThickness}'><ContentPresenter HorizontalAlignment='Center' VerticalAlignment='Center'/></Border></ControlTemplate></Setter.Value></Setter><Style.Triggers><Trigger Property='IsMouseOver' Value='True'><Setter Property='Background' Value='#d9c7ec'/></Trigger><Trigger Property='IsKeyboardFocused' Value='True'><Setter Property='BorderThickness' Value='2'/></Trigger></Style.Triggers></Style>");
        permissionButton.Click+=(s,e)=>AcceptPermission();permissionLayer.Children.Add(permissionButton);root.Children.Add(permissionLayer);
        SizeChanged+=(s,e)=>LayoutPermission();
        KeyDown+=(s,e)=>{if(e.Key==Key.Escape){Finish("escape");e.Handled=true;}else if(e.Key==Key.Enter&&permissionButton.Visibility==Visibility.Visible){AcceptPermission();e.Handled=true;}};
        media.MediaOpened+=(s,e)=>{
            if(media.NaturalDuration.HasTimeSpan)videoSeconds=media.NaturalDuration.TimeSpan.TotalSeconds;
            if(permissionNext>=videoSeconds)permissionEnabled=false;
            Log("MEDIA_OPENED duration="+(media.NaturalDuration.HasTimeSpan?media.NaturalDuration.TimeSpan.TotalSeconds.ToString("F3"):"unknown")+" size="+media.NaturalVideoWidth+"x"+media.NaturalVideoHeight);
            media.BeginAnimation(OpacityProperty,new System.Windows.Media.Animation.DoubleAnimation(0,1,TimeSpan.FromMilliseconds(160)));
        };
        media.MediaEnded+=(s,e)=>{Log("MEDIA_ENDED elapsed_ms="+clock.ElapsedMilliseconds);Finish("ended");};
        media.MediaFailed+=(s,e)=>{Log("MEDIA_FAILED "+e.ErrorException.Message);Finish("media_failed");};
        guard.Interval=TimeSpan.FromMilliseconds(50);
        guard.Tick+=(s,e)=>{
            if(permissionEnabled&&!permissionGranted&&!handoffRequested) {
                if(media.Position.TotalSeconds>=permissionShow&&permissionButton.Visibility!=Visibility.Visible){LayoutPermission();permissionButton.Visibility=Visibility.Visible;Cursor=Cursors.Arrow;permissionButton.Focus();Log("PERMISSION_BUTTON_READY");}
                if(media.Position.TotalSeconds>=permissionHold&&!permissionWaiting){media.Pause();media.Position=TimeSpan.FromSeconds(permissionHold);permissionWaiting=true;permissionWaitStarted=clock.ElapsedMilliseconds;Log("PERMISSION_WAIT position="+permissionHold.ToString("F3",CultureInfo.InvariantCulture));StartPermissionIdle();}
            }
            if(appId!=null&&!activationStarted&&media.Position.TotalSeconds>=Math.Max(0,videoSeconds-2.9))BeginActivation();
            if(activationFinished&&activatedAt==0)activatedAt=clock.ElapsedMilliseconds;
            if(handoffRequested&&!revealStarted&&clock.ElapsedMilliseconds-requestedAt>=230) {
                if(appId==null||(activatedAt>0&&clock.ElapsedMilliseconds-activatedAt>=600)||ActiveSeconds()>=videoSeconds+4.0) RevealApplication();
            }
            if(!handoffRequested&&ActiveSeconds()>=videoSeconds+4.0){Log("WATCHDOG");Finish("timeout");}
        };
        Loaded+=(s,e)=>{
            Log("START mode="+(appId==null?"preview":"launch")+" chrome=none transition=charcoal-crossfade file="+video);
            Log("DISPLAY mode=fullscreen stretch="+media.Stretch+" bounds="+Left+","+Top+","+ActualWidth+","+ActualHeight);
            clock.Restart();guard.Start();
            if(!File.Exists(video)){Log("MISSING_VIDEO");Finish("missing_video");return;}
            if(permissionIdlePath!=null){permissionIdle.Source=new Uri(permissionIdlePath);permissionIdle.Play();}
            media.Source=new Uri(video);media.Play();
        };
        Closing+=(s,e)=>{if(!closing){e.Cancel=true;Finish("window_close");}};
        Closed+=(s,e)=>{guard.Stop();media.Close();permissionIdle.Close();Log("CLOSED elapsed_ms="+clock.ElapsedMilliseconds);};
    }
    void BeginActivation()
    {
        if(appId==null||activationStarted)return;
        activationStarted=true;Log("APP_PREPARE elapsed_ms="+clock.ElapsedMilliseconds);
        var worker=new Thread(()=>{
            try {
                uint pid=AppActivation.Activate(appId);activationSucceeded=true;
                Log("APP_ACTIVATED phase=prepare id="+appId+" pid="+pid);
            } catch(Exception ex) {
                Log("APP_ACTIVATION_FAILED "+ex.Message);
                try {Process.Start(new ProcessStartInfo("explorer.exe","shell:AppsFolder\\"+appId){UseShellExecute=true});Log("APP_FALLBACK_REQUESTED");}catch(Exception fallback){Log("APP_FALLBACK_FAILED "+fallback.Message);}
            } finally {
                activationFinished=true;
                if(!closing)Dispatcher.BeginInvoke(new Action(()=>{if(!revealStarted)Activate();}));
            }
        });
        worker.IsBackground=true;worker.SetApartmentState(ApartmentState.STA);worker.Start();
    }
    void Finish(string reason)
    {
        if(handoffRequested||closing)return;
        handoffRequested=true;requestedAt=clock.ElapsedMilliseconds;
        EndPermissionWait();permissionButton.Visibility=Visibility.Collapsed;Cursor=Cursors.None;
        Log("FINISH reason="+reason);media.Pause();
        cover.BeginAnimation(OpacityProperty,new System.Windows.Media.Animation.DoubleAnimation(cover.Opacity,1,TimeSpan.FromMilliseconds(200)));
        BeginActivation();
    }
    void RevealApplication()
    {
        if(revealStarted)return;revealStarted=true;
        // This color-only overlay belongs to the launcher. No target-window inspection is needed.
        var veil=new Window {
            WindowStyle=WindowStyle.None,ResizeMode=ResizeMode.NoResize,AllowsTransparency=true,
            Background=Brush("#212121"),Left=Left,Top=Top,Width=ActualWidth,Height=ActualHeight,
            ShowInTaskbar=false,ShowActivated=false,Topmost=true,Opacity=1,Cursor=Cursors.None,
            Content=new Border { Background=Brush("#212121") }
        };
        veil.ContentRendered+=(s,e)=>{
            Hide();
            bool fading=false;
            Action reveal=()=>{
                if(fading||closing)return;fading=true;
                var fade=new System.Windows.Media.Animation.DoubleAnimation(1,0,TimeSpan.FromMilliseconds(850)) {
                    EasingFunction=new System.Windows.Media.Animation.CubicEase { EasingMode=System.Windows.Media.Animation.EasingMode.EaseInOut }
                };
                fade.Completed+=(a,b)=>{Log("HANDOFF_COMPLETE elapsed_ms="+clock.ElapsedMilliseconds);closing=true;veil.Close();Close();};
                Log("HANDOFF_FADE_START elapsed_ms="+clock.ElapsedMilliseconds);
                veil.BeginAnimation(OpacityProperty,fade);
            };
            if(appId!=null&&activationSucceeded) {
                var worker=new Thread(()=>{
                    try{uint pid=AppActivation.Activate(appId);Log("APP_ACTIVATED phase=reveal id="+appId+" pid="+pid);}catch(Exception ex){Log("APP_FOCUS_FAILED "+ex.Message);}
                    if(!closing)Dispatcher.BeginInvoke(reveal);
                });
                worker.IsBackground=true;worker.SetApartmentState(ApartmentState.STA);worker.Start();
                var timeout=new DispatcherTimer {Interval=TimeSpan.FromMilliseconds(900)};
                timeout.Tick+=(a,b)=>{timeout.Stop();reveal();};timeout.Start();
            }else reveal();
        };
        Log("HANDOFF_OVERLAY elapsed_ms="+clock.ElapsedMilliseconds+" bounds="+Left+","+Top+","+ActualWidth+","+ActualHeight);veil.Show();
    }
}
