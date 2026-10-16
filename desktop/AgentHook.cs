using System;
using System.IO;
using System.Net;
using System.Text;
using System.Web.Script.Serialization;
using System.Collections.Generic;

// A small native relay: no Node installation and no microphone or file scanning.
// On any failure, print nothing so the agent retains its own permission flow.
class AgentHook {
  static int Main(string[] args) {
    try {
      string agent = null, file = null;
      for (int i = 0; i + 1 < args.Length; i += 2) { if (args[i] == "--agent") agent = args[i+1]; else if (args[i] == "--bridge") file = args[i+1]; }
      if ((agent != "claude" && agent != "codex") || file == null || !File.Exists(file)) return 0;
      var json = new JavaScriptSerializer { MaxJsonLength = 131072 };
      var config = json.Deserialize<Dictionary<string, object>>(File.ReadAllText(file));
      int port = Convert.ToInt32(config["port"]); string token = Convert.ToString(config["token"]);
      if (port < 1 || port > 65535 || token.Length != 64) return 0;
      string input;
      using (var reader = new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false))) {
        var chars = new char[4096]; var buffer = new StringBuilder(); int count;
        while ((count = reader.Read(chars, 0, chars.Length)) > 0) { buffer.Append(chars, 0, count); if (buffer.Length > 100000) return 0; }
        input = buffer.ToString();
      }
      var payload = json.Deserialize<Dictionary<string, object>>(input);
      string eventName = payload.ContainsKey("hook_event_name") ? Convert.ToString(payload["hook_event_name"]) : "";
      bool waiting = eventName == "PermissionRequest" || (agent == "claude" && eventName == "PreToolUse" && payload.ContainsKey("tool_name") && Convert.ToString(payload["tool_name"]) == "AskUserQuestion");
      byte[] bytes = Encoding.UTF8.GetBytes(json.Serialize(new { agent = agent, @event = payload }));
      var request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/v1/events");
      request.Proxy = null; request.Method = "POST"; request.ContentType = "application/json";
      request.Headers["Authorization"] = "Bearer " + token; request.AllowAutoRedirect = false;
      request.Timeout = waiting ? 120000 : 2500; request.ReadWriteTimeout = request.Timeout;
      request.ContentLength = bytes.Length;
      using (var stream = request.GetRequestStream()) stream.Write(bytes, 0, bytes.Length);
      using (var response = request.GetResponse()) using (var reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8)) {
        string output = reader.ReadToEnd();
        if (waiting && output.Length < 100000 && output != "{}") { json.DeserializeObject(output); Console.OutputEncoding = new UTF8Encoding(false); Console.WriteLine(output); }
      }
    } catch { /* Agent fallback is deliberate. Never synthesize a decision. */ }
    return 0;
  }
}
