Pod::Spec.new do |s|
  s.name           = 'WidgetBridge'
  s.version        = '1.0.0'
  s.summary        = 'Shares the Trace widget snapshot URL with the WidgetKit target'
  s.description    = 'Writes the signed snapshot URL to the shared app group and reloads widget timelines.'
  s.author         = ''
  s.homepage       = 'https://github.com/KIDUSDANIEL576/trace'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
end
