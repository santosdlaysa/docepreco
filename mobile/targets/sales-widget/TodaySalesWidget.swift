import SwiftUI
import WidgetKit

private struct SalesSummary: Decodable {
    let expiresAt: Double
    let amount: String
    let details: String
    let updated: String
}

private struct SalesEntry: TimelineEntry {
    let date: Date
    let summary: SalesSummary?
}

private struct SalesProvider: TimelineProvider {
    func placeholder(in context: Context) -> SalesEntry {
        SalesEntry(date: .now, summary: SalesSummary(
            expiresAt: 0, amount: "R$ 245,00", details: "8 vendas", updated: "Atualizado às 14:32"
        ))
    }

    func getSnapshot(in context: Context, completion: @escaping (SalesEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : currentEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SalesEntry>) -> Void) {
        let current = currentEntry()
        var entries = [current]
        if let summary = current.summary {
            entries.append(SalesEntry(date: Date(timeIntervalSince1970: summary.expiresAt / 1000), summary: nil))
        }
        completion(Timeline(entries: entries, policy: .never))
    }

    private func currentEntry() -> SalesEntry {
        let now = Date.now
        let defaults = UserDefaults(suiteName: "group.com.laysadiniz.sweetpricing.saleswidget")
        if let raw = defaults?.string(forKey: "todaySales"),
           let summary = try? JSONDecoder().decode(SalesSummary.self, from: Data(raw.utf8)),
           summary.expiresAt > now.timeIntervalSince1970 * 1000 {
            return SalesEntry(date: now, summary: summary)
        }
        return SalesEntry(date: now, summary: nil)
    }
}

private struct SalesWidgetView: View {
    let entry: SalesEntry
    private let accent = Color(red: 0.64, green: 0.06, blue: 0.31)
    private let ink = Color(red: 0.18, green: 0.08, blue: 0.13)
    private let muted = Color(red: 0.40, green: 0.25, blue: 0.31)
    private let surface = Color(red: 1, green: 0.94, blue: 0.96)

    private var content: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 5) {
                Image(systemName: "chart.bar.fill").accessibilityHidden(true)
                Text("Vendas de hoje")
            }
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(accent)
            .lineLimit(1)

            Spacer(minLength: 5)
            Text(entry.summary?.amount ?? "—")
                .font(.system(size: 25, weight: .bold, design: .rounded))
                .foregroundColor(ink)
                .lineLimit(1)
                .minimumScaleFactor(0.45)
            Text(entry.summary?.details ?? "Abra o app para sincronizar")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(ink)
                .lineLimit(2)
            if let summary = entry.summary {
                Text(summary.updated)
                    .font(.system(size: 9))
                    .foregroundColor(muted)
                    .lineLimit(1)
            }
            Spacer(minLength: 5)
            Text("Ver vendas →")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(accent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    var body: some View {
        Group {
            if #available(iOSApplicationExtension 17.0, *) {
                content.containerBackground(surface, for: .widget)
            } else {
                content.padding(14).background(surface)
            }
        }
        .widgetURL(URL(string: "docepreco://vendas?periodo=hoje"))
    }
}

@main
struct TodaySalesWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TodaySalesWidget", provider: SalesProvider()) { entry in
            SalesWidgetView(entry: entry)
        }
        .configurationDisplayName("Vendas de hoje")
        .description("Consulte o total vendido hoje e abra suas vendas com um toque.")
        .supportedFamilies([.systemSmall])
    }
}
