// plugins/with-volume-key-triggers.js
const { withMainActivity } = require('@expo/config-plugins');

const MARK = {
  imports: '// [vk-plugin] imports',
  fields: '// [vk-plugin] fields',
  methods: '// [vk-plugin] methods',
};

const IMPORTS_KT = `
${MARK.imports}
import android.view.KeyEvent
import android.os.Handler
import android.os.Looper
import android.media.AudioManager
import android.content.Context
import com.github.kevinejohn.keyevent.KeyEventModule
`.trim();

const FIELDS_KT = `
${MARK.fields}
private val __vkHandler = Handler(Looper.getMainLooper())
private var __vkLastUpAt: Long = 0L
private var __vkLastDownAt: Long = 0L
private var __vkUpPending = false
private var __vkDownPending = false
private val __vkWindowMs = 300L
private fun __vkAdjustVolume(isUp: Boolean) {
  val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
  val dir = if (isUp) AudioManager.ADJUST_RAISE else AudioManager.ADJUST_LOWER
  am.adjustStreamVolume(AudioManager.STREAM_MUSIC, dir, AudioManager.FLAG_SHOW_UI)
}
`.trim();

const METHODS_KT = `
${MARK.methods}
override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
  KeyEventModule.getInstance().onKeyDownEvent(keyCode, event)
  if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
    val now = System.currentTimeMillis()
    if (__vkUpPending && (now - __vkLastUpAt) <= __vkWindowMs) {
      __vkUpPending = false // double: cancel single
    } else {
      __vkUpPending = true
      __vkLastUpAt = now
      __vkHandler.postDelayed({
        if (__vkUpPending) {
          __vkUpPending = false
          __vkAdjustVolume(true) // single UP => volume+
        }
      }, __vkWindowMs)
    }
    return true
  }
  if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
    val now = System.currentTimeMillis()
    if (__vkDownPending && (now - __vkLastDownAt) <= __vkWindowMs) {
      __vkDownPending = false // double
    } else {
      __vkDownPending = true
      __vkLastDownAt = now
      __vkHandler.postDelayed({
        if (__vkDownPending) {
          __vkDownPending = false
          __vkAdjustVolume(false) // single DOWN => volume-
        }
      }, __vkWindowMs)
    }
    return true
  }
  return super.onKeyDown(keyCode, event)
}

override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
  KeyEventModule.getInstance().onKeyUpEvent(keyCode, event)
  if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
    return true
  }
  return super.onKeyUp(keyCode, event)
}

override fun onKeyMultiple(keyCode: Int, repeatCount: Int, event: KeyEvent?): Boolean {
  if (event != null) {
    KeyEventModule.getInstance().onKeyMultipleEvent(keyCode, repeatCount, event)
  }
  return super.onKeyMultiple(keyCode, repeatCount, event)
}
`.trim();

const IMPORTS_JAVA = `
${MARK.imports}
import android.view.KeyEvent;
import android.os.Handler;
import android.os.Looper;
import android.media.AudioManager;
import android.content.Context;
import com.github.kevinejohn.keyevent.KeyEventModule;
`.trim();

const FIELDS_JAVA = `
${MARK.fields}
private Handler __vkHandler = new Handler(Looper.getMainLooper());
private long __vkLastUpAt = 0L;
private long __vkLastDownAt = 0L;
private boolean __vkUpPending = false;
private boolean __vkDownPending = false;
private long __vkWindowMs = 300L;
private void __vkAdjustVolume(boolean isUp) {
  AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
  int dir = isUp ? AudioManager.ADJUST_RAISE : AudioManager.ADJUST_LOWER;
  am.adjustStreamVolume(AudioManager.STREAM_MUSIC, dir, AudioManager.FLAG_SHOW_UI);
}
`.trim();

const METHODS_JAVA = `
${MARK.methods}
@Override
public boolean onKeyDown(int keyCode, KeyEvent event) {
  KeyEventModule.getInstance().onKeyDownEvent(keyCode, event);
  if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
    long now = System.currentTimeMillis();
    if (__vkUpPending && (now - __vkLastUpAt) <= __vkWindowMs) {
      __vkUpPending = false;
    } else {
      __vkUpPending = true;
      __vkLastUpAt = now;
      __vkHandler.postDelayed(() -> {
        if (__vkUpPending) {
          __vkUpPending = false;
          __vkAdjustVolume(true);
        }
      }, __vkWindowMs);
    }
    return true;
  }
  if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
    long now = System.currentTimeMillis();
    if (__vkDownPending && (now - __vkLastDownAt) <= __vkWindowMs) {
      __vkDownPending = false;
    } else {
      __vkDownPending = true;
      __vkLastDownAt = now;
      __vkHandler.postDelayed(() -> {
        if (__vkDownPending) {
          __vkDownPending = false;
          __vkAdjustVolume(false);
        }
      }, __vkWindowMs);
    }
    return true;
  }
  return super.onKeyDown(keyCode, event);
}

@Override
public boolean onKeyUp(int keyCode, KeyEvent event) {
  KeyEventModule.getInstance().onKeyUpEvent(keyCode, event);
  if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
    return true;
  }
  return super.onKeyUp(keyCode, event);
}

@Override
public boolean onKeyMultiple(int keyCode, int repeatCount, KeyEvent event) {
  KeyEventModule.getInstance().onKeyMultipleEvent(keyCode, repeatCount, event);
  return super.onKeyMultiple(keyCode, event);
}
`.trim();

function insertAfterFirstImportOrPackage(src, toInsert) {
  // package 라인 다음에 바로 삽입 (가장 보수적)
  return src.replace(/package [^\n]+\n/, (m) => m + toInsert + '\n');
}

function insertAfterClassOpen(src, insertion) {
  const classOpen = src.match(/class\s+MainActivity[^{]*\{/);
  if (!classOpen) return src;
  const idx = src.indexOf(classOpen[0]) + classOpen[0].length;
  return src.slice(0, idx) + '\n' + insertion + '\n' + src.slice(idx);
}

module.exports = function withVolumeKeyTriggers(config) {
  console.log('[with-volume-key-triggers] plugin start');
  return withMainActivity(config, (mod) => {
    const isKotlin = mod.modResults.language === 'kt';
    console.log('[with-volume-key-triggers] MainActivity language =', isKotlin ? 'Kotlin' : 'Java');

    let src = mod.modResults.contents;

    // 이미 주입되어 있으면 스킵
    if (src.includes(MARK.methods) && src.includes(MARK.fields)) {
      console.log('[with-volume-key-triggers] already injected, skip');
      mod.modResults.contents = src;
      return mod;
    }

    // 1) imports (package 뒤에 강제 삽입, 중복 방지)
    if (!src.includes(MARK.imports)) {
      src = insertAfterFirstImportOrPackage(src, isKotlin ? IMPORTS_KT : IMPORTS_JAVA);
    }

    // 2) fields (class open 뒤에 삽입)
    if (!src.includes(MARK.fields)) {
      src = insertAfterClassOpen(src, isKotlin ? FIELDS_KT : FIELDS_JAVA);
    }

    // 3) methods (class open 뒤에 삽입)
    if (!src.includes(MARK.methods)) {
      src = insertAfterClassOpen(src, isKotlin ? METHODS_KT : METHODS_JAVA);
    }

    mod.modResults.contents = src;
    console.log('[with-volume-key-triggers] injected successfully');
    return mod;
  });
};
