using System;
using System.Collections.Generic;
using System.Linq;
using System.Speech.Recognition;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

// A tiny local bridge to Windows' installed speech recognizers. No network access.
internal static class SpeechBridge {
    private static readonly object OutputLock = new object();
    private static void Send(object value) {
        lock (OutputLock) { Console.WriteLine(new JavaScriptSerializer().Serialize(value)); Console.Out.Flush(); }
    }
    public static int Main(string[] args) {
        Console.OutputEncoding = new UTF8Encoding(false);
        try {
            var installed = SpeechRecognitionEngine.InstalledRecognizers();
            if (args.Length > 0 && args[0] == "--list") {
                Send(installed.Select(info => new Dictionary<string, string> { { "id", info.Culture.Name }, { "name", info.Description } }).ToArray());
                return 0;
            }
            var language = args.Length > 0 ? args[0] : "";
            var selected = installed.FirstOrDefault(info => info.Culture.Name == language) ?? installed.FirstOrDefault();
            if (selected == null) throw new InvalidOperationException("No Windows speech language is installed.");
            using (var engine = new SpeechRecognitionEngine(selected)) {
                engine.LoadGrammar(new DictationGrammar());
                engine.SpeechRecognized += (sender, item) => {
                    if (!String.IsNullOrWhiteSpace(item.Result.Text)) Send(new { text = item.Result.Text });
                };
                engine.RecognizeCompleted += (sender, item) => {
                    if (item.Error != null) Send(new { error = item.Error.Message });
                    Send(new { stopped = true });
                };
                engine.SetInputToDefaultAudioDevice();
                engine.RecognizeAsync(RecognizeMode.Multiple);
                Thread.Sleep(Timeout.Infinite);
            }
        } catch (Exception error) { Send(new { error = error.Message }); return 1; }
        return 0;
    }
}
