package expo.modules.widgetbridge

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.view.View
import android.widget.RemoteViews
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Home-screen widget: shows the couple's latest canvas snapshot PNG.
 * The app stores a signed URL in SharedPreferences (WidgetBridgeModule) and
 * broadcasts an update; updatePeriodMillis polls as a safety net.
 */
class TraceWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val url = context
      .getSharedPreferences("trace_widget", Context.MODE_PRIVATE)
      .getString("snapshotUrl", null)
    if (url == null) {
      for (id in ids) manager.updateAppWidget(id, RemoteViews(context.packageName, R.layout.trace_widget))
      return
    }
    val pending = goAsync()
    thread {
      try {
        val bitmap = fetchBitmap(url)
        for (id in ids) {
          val views = RemoteViews(context.packageName, R.layout.trace_widget)
          if (bitmap != null) {
            views.setImageViewBitmap(R.id.trace_widget_image, bitmap)
            views.setViewVisibility(R.id.trace_widget_empty, View.GONE)
          }
          manager.updateAppWidget(id, views)
        }
      } finally {
        pending.finish()
      }
    }
  }

  private fun fetchBitmap(url: String): Bitmap? = try {
    val conn = URL(url).openConnection() as HttpURLConnection
    // goAsync() only guarantees ~10s total — stay well inside it
    conn.connectTimeout = 4_000
    conn.readTimeout = 4_000
    conn.inputStream.use { BitmapFactory.decodeStream(it) }
  } catch (e: Exception) {
    null
  }
}
