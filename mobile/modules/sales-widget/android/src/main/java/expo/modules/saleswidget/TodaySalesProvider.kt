package expo.modules.saleswidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject

class TodaySalesProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    render(context, manager, appWidgetIds)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action in listOf(Intent.ACTION_DATE_CHANGED, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED)) {
      updateAll(context)
    }
  }

  companion object {
    private const val KEY = "todaySales"

    fun saveSummary(context: Context, summary: String?) {
      val editor = context.getSharedPreferences("salesWidget", Context.MODE_PRIVATE).edit()
      if (summary == null) editor.remove(KEY) else editor.putString(KEY, summary)
      editor.apply()
      updateAll(context)
    }

    private fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, TodaySalesProvider::class.java))
      render(context, manager, ids)
    }

    private fun render(context: Context, manager: AppWidgetManager, ids: IntArray) {
      if (ids.isEmpty()) return
      val raw = context.getSharedPreferences("salesWidget", Context.MODE_PRIVATE).getString(KEY, null)
      val summary = raw?.let { runCatching { JSONObject(it) }.getOrNull() }
        ?.takeIf { it.optLong("expiresAt") > System.currentTimeMillis() }
      val openSales = Intent(Intent.ACTION_VIEW, Uri.parse("docepreco://vendas?periodo=hoje"))
        .setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      val click = PendingIntent.getActivity(context, 0, openSales, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      val views = RemoteViews(context.packageName, R.layout.sales_widget).apply {
        setTextViewText(R.id.sales_widget_amount, summary?.optString("amount") ?: "—")
        setTextViewText(R.id.sales_widget_details, summary?.optString("details") ?: context.getString(R.string.sales_widget_sync))
        setTextViewText(R.id.sales_widget_updated, summary?.optString("updated").orEmpty())
        setOnClickPendingIntent(R.id.sales_widget_root, click)
      }
      manager.updateAppWidget(ids, views)
    }
  }
}
