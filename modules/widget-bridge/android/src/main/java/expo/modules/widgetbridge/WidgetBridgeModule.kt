package expo.modules.widgetbridge

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WidgetBridgeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WidgetBridge")

    Function("setSnapshot") { url: String ->
      val context = appContext.reactContext ?: return@Function
      context
        .getSharedPreferences("trace_widget", Context.MODE_PRIVATE)
        .edit()
        .putString("snapshotUrl", url)
        .apply()

      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, TraceWidgetProvider::class.java))
      if (ids.isNotEmpty()) {
        val intent = Intent(context, TraceWidgetProvider::class.java).apply {
          action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
          putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
        context.sendBroadcast(intent)
      }
    }
  }
}
