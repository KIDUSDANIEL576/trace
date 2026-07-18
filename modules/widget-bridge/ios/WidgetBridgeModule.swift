import ExpoModulesCore
import WidgetKit

public class WidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    Function("setSnapshot") { (url: String) in
      let defaults = UserDefaults(suiteName: "group.com.digirafthub.trace")
      defaults?.set(url, forKey: "snapshotUrl")
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
