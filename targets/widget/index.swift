import WidgetKit
import SwiftUI

// The app writes a signed snapshot URL here (modules/widget-bridge) and asks
// WidgetKit to reload; the server re-renders the PNG on every stroke change.
private let appGroup = "group.com.digirafthub.trace"
private let night = Color(red: 12 / 255, green: 11 / 255, blue: 16 / 255)

struct SnapshotEntry: TimelineEntry {
  let date: Date
  let image: UIImage?
}

struct SnapshotProvider: TimelineProvider {
  func placeholder(in context: Context) -> SnapshotEntry {
    SnapshotEntry(date: Date(), image: nil)
  }

  func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
    fetch(completion: completion)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
    fetch { entry in
      // Poll as a safety net; the app triggers an immediate reload on changes.
      completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60))))
    }
  }

  private func fetch(completion: @escaping (SnapshotEntry) -> Void) {
    guard
      let urlString = UserDefaults(suiteName: appGroup)?.string(forKey: "snapshotUrl"),
      let url = URL(string: urlString)
    else {
      completion(SnapshotEntry(date: Date(), image: nil))
      return
    }
    URLSession.shared.dataTask(with: url) { data, _, _ in
      completion(SnapshotEntry(date: Date(), image: data.flatMap { UIImage(data: $0) }))
    }.resume()
  }
}

struct TraceWidgetView: View {
  var entry: SnapshotEntry

  var body: some View {
    Group {
      if let image = entry.image {
        Image(uiImage: image)
          .resizable()
          .aspectRatio(contentMode: .fill)
      } else {
        ZStack {
          night
          Text("leave me a trace")
            .font(.system(size: 14, design: .rounded))
            .foregroundColor(.white.opacity(0.7))
        }
      }
    }
    .containerBackground(for: .widget) { night }
  }
}

@main
struct TraceWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "TraceWidget", provider: SnapshotProvider()) { entry in
      TraceWidgetView(entry: entry)
    }
    .configurationDisplayName("Trace")
    .description("Your shared canvas, always on your home screen.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
    .contentMarginsDisabled()
  }
}
