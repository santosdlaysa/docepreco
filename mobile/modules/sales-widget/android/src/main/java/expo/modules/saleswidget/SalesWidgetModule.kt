package expo.modules.saleswidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SalesWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DocePrecoSalesWidget")

    Function("setSummary") { summary: String? ->
      appContext.reactContext?.let { context ->
        TodaySalesProvider.saveSummary(context, summary)
      }
    }
  }
}
