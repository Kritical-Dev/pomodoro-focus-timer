// ==UserScript==
// @name         Pomodoro Focus Timer
// @namespace    github.com/Kritical-Dev/pomodoro-focus-timer
// @version      1.4.0
// @description  A modern, customizable Pomodoro timer with per-task and daily focus tracking. Draggable widget, tab-title countdown, cross-tab single instance.
// @author       KriticalDev
// @homepageURL  https://github.com/Kritical-Dev/pomodoro-focus-timer
// @supportURL   https://github.com/Kritical-Dev/pomodoro-focus-timer/issues
// @updateURL    https://raw.githubusercontent.com/Kritical-Dev/pomodoro-focus-timer/main/pomodoro.user.js
// @downloadURL  https://raw.githubusercontent.com/Kritical-Dev/pomodoro-focus-timer/main/pomodoro.user.js
// @icon         data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='20' r='10' fill='%23f43f5e'/><path d='M16 8c1-3 4-4 7-3.5-.5 2-2 3.5-4 4 2.5 1 4 3 4 5.5-2.5 0-4.5-1-5.5-3-.5 2-2 3.5-4 4 0-2.5.5-5 2.5-7z' fill='%2322c55e'/></svg>
// @match        *://*/*
// @noframes
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        GM_addValueChangeListener
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // Only run in the top frame — one widget per tab.
  if (window.top !== window.self) return;

  // Inlined at build time (see build.mjs) — compiled Tailwind CSS.
  const TAILWIND_CSS = "*,:after,:before{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }/*! tailwindcss v3.4.13 | MIT License | https://tailwindcss.com*/*,:after,:before{box-sizing:border-box;border:0 solid #e5e7eb}:after,:before{--tw-content:\"\"}:host,html{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;font-feature-settings:normal;font-variation-settings:normal;-webkit-tap-highlight-color:transparent}body{margin:0;line-height:inherit}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-feature-settings:normal;font-variation-settings:normal;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-feature-settings:inherit;font-variation-settings:inherit;font-size:100%;font-weight:inherit;line-height:inherit;letter-spacing:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}fieldset{margin:0}fieldset,legend{padding:0}menu,ol,ul{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{opacity:1;color:#9ca3af}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}[role=button],button{cursor:pointer}:disabled{cursor:default}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]{display:none}.pw-iconbtn{border-radius:8px;padding:6px;--tw-text-opacity:1;color:rgb(148 163 184/var(--tw-text-opacity));transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.pw-iconbtn:hover{background-color:rgba(51,65,85,.7);--tw-text-opacity:1;color:rgb(241 245 249/var(--tw-text-opacity))}.pw-ctl{display:flex;height:44px;width:44px;align-items:center;justify-content:center;border-radius:9999px;--tw-bg-opacity:1;background-color:rgb(30 41 59/var(--tw-bg-opacity));--tw-text-opacity:1;color:rgb(203 213 225/var(--tw-text-opacity));transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.pw-ctl:hover{--tw-bg-opacity:1;background-color:rgb(51 65 85/var(--tw-bg-opacity));--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.pw-stepbtn{display:flex;height:28px;width:28px;align-items:center;justify-content:center;border-radius:6px;background-color:rgba(51,65,85,.7);--tw-text-opacity:1;color:rgb(203 213 225/var(--tw-text-opacity));transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.pw-stepbtn:hover{--tw-bg-opacity:1;background-color:rgb(71 85 105/var(--tw-bg-opacity));--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.pw-label{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;--tw-text-opacity:1;color:rgb(148 163 184/var(--tw-text-opacity))}.pw-num{-webkit-appearance:textfield;appearance:textfield;-moz-appearance:textfield}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}.static{position:static}.fixed{position:fixed}.absolute{position:absolute}.relative{position:relative}.inset-0{inset:0}.bottom-0{bottom:0}.left-4{left:16px}.mx-auto{margin-left:auto;margin-right:auto}.my-3{margin-top:12px}.mb-3,.my-3{margin-bottom:12px}.ml-2{margin-left:8px}.mt-0\\.5{margin-top:2px}.mt-1{margin-top:4px}.mt-1\\.5{margin-top:6px}.mt-2{margin-top:8px}.mt-3{margin-top:12px}.flex{display:flex}.grid{display:grid}.hidden{display:none}.h-14{height:56px}.h-2{height:8px}.h-24{height:96px}.h-4{height:16px}.h-44{height:176px}.h-5{height:20px}.h-7{height:28px}.h-\\[18px\\]{height:18px}.h-full{height:100%}.max-h-32{max-height:128px}.w-11{width:44px}.w-14{width:56px}.w-2{width:8px}.w-4{width:16px}.w-44{width:176px}.w-5{width:20px}.w-7{width:28px}.w-9{width:36px}.w-\\[18px\\]{width:18px}.w-\\[290px\\]{width:290px}.w-full{width:100%}.flex-1{flex:1 1 0%}.shrink{flex-shrink:1}.shrink-0{flex-shrink:0}.-rotate-90{--tw-rotate:-90deg;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.cursor-move{cursor:move}.cursor-pointer{cursor:pointer}.select-none{-webkit-user-select:none;-moz-user-select:none;user-select:none}.select-text{-webkit-user-select:text;-moz-user-select:text;user-select:text}.resize{resize:both}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.flex-col{flex-direction:column}.items-end{align-items:flex-end}.items-center{align-items:center}.justify-end{justify-content:flex-end}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.gap-1{gap:4px}.gap-1\\.5{gap:6px}.gap-2{gap:8px}.gap-3{gap:12px}.space-y-1>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(4px*(1 - var(--tw-space-y-reverse)));margin-bottom:calc(4px*var(--tw-space-y-reverse))}.space-y-2>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(8px*(1 - var(--tw-space-y-reverse)));margin-bottom:calc(8px*var(--tw-space-y-reverse))}.space-y-2\\.5>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(10px*(1 - var(--tw-space-y-reverse)));margin-bottom:calc(10px*var(--tw-space-y-reverse))}.overflow-hidden{overflow:hidden}.overflow-y-auto{overflow-y:auto}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rounded{border-radius:4px}.rounded-2xl{border-radius:16px}.rounded-full{border-radius:9999px}.rounded-lg{border-radius:8px}.rounded-md{border-radius:6px}.rounded-xl{border-radius:12px}.rounded-t{border-top-left-radius:4px;border-top-right-radius:4px}.rounded-t-lg{border-top-left-radius:8px;border-top-right-radius:8px}.border{border-width:1px}.border-b{border-bottom-width:1px}.border-b-0{border-bottom-width:0}.border-t{border-top-width:1px}.border-slate-700\\/60{border-color:rgba(51,65,85,.6)}.border-slate-700\\/70{border-color:rgba(51,65,85,.7)}.border-slate-800{--tw-border-opacity:1;border-color:rgb(30 41 59/var(--tw-border-opacity))}.bg-emerald-500{--tw-bg-opacity:1;background-color:rgb(16 185 129/var(--tw-bg-opacity))}.bg-emerald-500\\/15{background-color:rgba(16,185,129,.15)}.bg-rose-500{--tw-bg-opacity:1;background-color:rgb(244 63 94/var(--tw-bg-opacity))}.bg-rose-500\\/15{background-color:rgba(244,63,94,.15)}.bg-sky-500{--tw-bg-opacity:1;background-color:rgb(14 165 233/var(--tw-bg-opacity))}.bg-sky-500\\/15{background-color:rgba(14,165,233,.15)}.bg-slate-600{--tw-bg-opacity:1;background-color:rgb(71 85 105/var(--tw-bg-opacity))}.bg-slate-700{--tw-bg-opacity:1;background-color:rgb(51 65 85/var(--tw-bg-opacity))}.bg-slate-800\\/40{background-color:rgba(30,41,59,.4)}.bg-slate-800\\/70{background-color:rgba(30,41,59,.7)}.bg-slate-900{--tw-bg-opacity:1;background-color:rgb(15 23 42/var(--tw-bg-opacity))}.stroke-emerald-500{stroke:#10b981}.stroke-rose-500{stroke:#f43f5e}.stroke-sky-500{stroke:#0ea5e9}.stroke-slate-700\\/50{stroke:rgba(51,65,85,.5)}.p-2{padding:8px}.p-2\\.5{padding:10px}.px-2\\.5{padding-left:10px;padding-right:10px}.px-3{padding-left:12px;padding-right:12px}.px-3\\.5{padding-left:14px;padding-right:14px}.px-4{padding-left:16px;padding-right:16px}.py-0\\.5{padding-top:2px;padding-bottom:2px}.py-1\\.5{padding-top:6px;padding-bottom:6px}.py-2{padding-top:8px;padding-bottom:8px}.pb-4{padding-bottom:16px}.pr-0\\.5{padding-right:2px}.pt-2{padding-top:8px}.pt-3{padding-top:12px}.text-center{text-align:center}.font-sans{font-family:ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji}.text-3xl{font-size:30px;line-height:36px}.text-\\[11px\\]{font-size:11px}.text-\\[12px\\]{font-size:12px}.text-\\[13px\\]{font-size:13px}.text-\\[9px\\]{font-size:9px}.text-base{font-size:16px;line-height:24px}.text-lg{font-size:18px;line-height:28px}.text-sm{font-size:14px;line-height:20px}.font-bold{font-weight:700}.font-medium{font-weight:500}.font-semibold{font-weight:600}.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:var(--tw-ordinal) var(--tw-slashed-zero) var(--tw-numeric-figure) var(--tw-numeric-spacing) var(--tw-numeric-fraction)}.leading-none{line-height:1}.leading-normal{line-height:1.5}.leading-relaxed{line-height:1.625}.tracking-normal{letter-spacing:0}.tracking-tight{letter-spacing:-.025em}.tracking-wide{letter-spacing:.025em}.text-emerald-400{--tw-text-opacity:1;color:rgb(52 211 153/var(--tw-text-opacity))}.text-rose-400{--tw-text-opacity:1;color:rgb(251 113 133/var(--tw-text-opacity))}.text-sky-400{--tw-text-opacity:1;color:rgb(56 189 248/var(--tw-text-opacity))}.text-slate-100{--tw-text-opacity:1;color:rgb(241 245 249/var(--tw-text-opacity))}.text-slate-200{--tw-text-opacity:1;color:rgb(226 232 240/var(--tw-text-opacity))}.text-slate-300{--tw-text-opacity:1;color:rgb(203 213 225/var(--tw-text-opacity))}.text-slate-400{--tw-text-opacity:1;color:rgb(148 163 184/var(--tw-text-opacity))}.text-slate-50{--tw-text-opacity:1;color:rgb(248 250 252/var(--tw-text-opacity))}.text-slate-500{--tw-text-opacity:1;color:rgb(100 116 139/var(--tw-text-opacity))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.antialiased{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}.placeholder-slate-500::-moz-placeholder{--tw-placeholder-opacity:1;color:rgb(100 116 139/var(--tw-placeholder-opacity))}.placeholder-slate-500::placeholder{--tw-placeholder-opacity:1;color:rgb(100 116 139/var(--tw-placeholder-opacity))}.shadow-2xl{--tw-shadow:0 25px 50px -12px rgba(0,0,0,.25);--tw-shadow-colored:0 25px 50px -12px var(--tw-shadow-color)}.shadow-2xl,.shadow-lg{box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-lg{--tw-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);--tw-shadow-colored:0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color)}.shadow-xl{--tw-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1);--tw-shadow-colored:0 20px 25px -5px var(--tw-shadow-color),0 8px 10px -6px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-black\\/40{--tw-shadow-color:rgba(0,0,0,.4);--tw-shadow:var(--tw-shadow-colored)}.shadow-black\\/50{--tw-shadow-color:rgba(0,0,0,.5);--tw-shadow:var(--tw-shadow-colored)}.shadow-emerald-500\\/30{--tw-shadow-color:rgba(16,185,129,.3);--tw-shadow:var(--tw-shadow-colored)}.shadow-rose-500\\/30{--tw-shadow-color:rgba(244,63,94,.3);--tw-shadow:var(--tw-shadow-colored)}.shadow-sky-500\\/30{--tw-shadow-color:rgba(14,165,233,.3);--tw-shadow:var(--tw-shadow-colored)}.outline-none{outline:2px solid transparent;outline-offset:2px}.blur{--tw-blur:blur(8px);filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}.transition-all{transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.transition-colors{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.pw-num::-webkit-inner-spin-button,.pw-num::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}#pw-tasks::-webkit-scrollbar{width:6px}#pw-tasks::-webkit-scrollbar-thumb{background:rgba(71,85,105,.7);border-radius:9999px}#pw-tasks::-webkit-scrollbar-track{background:transparent}#pw-wrap button:focus-visible,#pw-wrap input:focus-visible{outline:2px solid rgba(148,163,184,.9);outline-offset:2px}@media (prefers-reduced-motion:reduce){#pw-wrap *,#pw-wrap :after,#pw-wrap :before{transition-duration:.01ms!important;animation-duration:.01ms!important}#pw-wrap button:hover{transform:none!important}}.after\\:absolute:after{content:var(--tw-content);position:absolute}.after\\:left-0\\.5:after{content:var(--tw-content);left:2px}.after\\:top-0\\.5:after{content:var(--tw-content);top:2px}.after\\:h-4:after{content:var(--tw-content);height:16px}.after\\:w-4:after{content:var(--tw-content);width:16px}.after\\:rounded-full:after{content:var(--tw-content);border-radius:9999px}.after\\:bg-slate-400:after{content:var(--tw-content);--tw-bg-opacity:1;background-color:rgb(148 163 184/var(--tw-bg-opacity))}.after\\:transition-all:after{content:var(--tw-content);transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.hover\\:scale-105:hover{--tw-scale-x:1.05;--tw-scale-y:1.05;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.hover\\:bg-emerald-400:hover{--tw-bg-opacity:1;background-color:rgb(52 211 153/var(--tw-bg-opacity))}.hover\\:bg-rose-400:hover{--tw-bg-opacity:1;background-color:rgb(251 113 133/var(--tw-bg-opacity))}.hover\\:bg-sky-400:hover{--tw-bg-opacity:1;background-color:rgb(56 189 248/var(--tw-bg-opacity))}.hover\\:bg-slate-800:hover{--tw-bg-opacity:1;background-color:rgb(30 41 59/var(--tw-bg-opacity))}.hover\\:bg-slate-800\\/70:hover{background-color:rgba(30,41,59,.7)}.hover\\:text-slate-100:hover{--tw-text-opacity:1;color:rgb(241 245 249/var(--tw-text-opacity))}.focus\\:border-rose-500\\/60:focus{border-color:rgba(244,63,94,.6)}.peer:checked~.peer-checked\\:bg-emerald-500{--tw-bg-opacity:1;background-color:rgb(16 185 129/var(--tw-bg-opacity))}.peer:checked~.peer-checked\\:after\\:translate-x-4:after{content:var(--tw-content);--tw-translate-x:16px;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.peer:checked~.peer-checked\\:after\\:bg-white:after{content:var(--tw-content);--tw-bg-opacity:1;background-color:rgb(255 255 255/var(--tw-bg-opacity))}";

  /* ------------------------------------------------------------------ *
   * Storage (GM_* with localStorage fallback)
   *
   * Everything read back is untrusted (older versions, manual edits, other
   * scripts sharing localStorage), so each key goes through a load*()
   * sanitiser below before it is used.
   * ------------------------------------------------------------------ */
  const store = {
    get(key) {
      try {
        const raw = typeof GM_getValue !== 'undefined' ? GM_getValue(key) : localStorage.getItem(key);
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        return undefined;
      }
    },
    set(key, value) {
      try {
        const raw = JSON.stringify(value);
        if (typeof GM_setValue !== 'undefined') GM_setValue(key, raw);
        else localStorage.setItem(key, raw);
      } catch (e) { /* storage full / blocked — non-fatal */ }
    },
  };

  /* ------------------------------------------------------------------ *
   * Settings & constants
   * ------------------------------------------------------------------ */
  const DEFAULT_SETTINGS = {
    focusMin: 25,
    shortMin: 5,
    longMin: 15,
    rounds: 4,          // focus rounds before the long break
    autoBreaks: true,   // auto-start breaks after a focus round
    autoFocus: false,   // auto-start the next focus round after a break
    sound: true,
    notify: true,
    titleTimer: true,   // show countdown in the tab title
  };

  const RANGES = {
    focusMin: [1, 180],
    shortMin: [1, 60],
    longMin: [1, 120],
    rounds: [1, 12],
  };

  const SETTING_ROWS = [
    ['focusMin', 'Focus duration (min)'],
    ['shortMin', 'Short break (min)'],
    ['longMin', 'Long break (min)'],
    ['rounds', 'Rounds per cycle'],
  ];

  const TOGGLES = [
    ['autoBreaks', 'Auto-start breaks'],
    ['autoFocus', 'Auto-start focus rounds'],
    ['sound', 'Completion sound'],
    ['notify', 'Notifications'],
    ['titleTimer', 'Show timer in tab title'],
  ];

  // Full literal class names so the Tailwind compiler picks them up.
  const PHASES = {
    focus: {
      label: 'Focus', icon: '🍅', setting: 'focusMin',
      ring: 'stroke-rose-500',
      badge: 'bg-rose-500/15 text-rose-400',
      play: 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/30',
      dot: 'bg-rose-500',
    },
    short: {
      label: 'Short Break', icon: '☕', setting: 'shortMin',
      ring: 'stroke-emerald-500',
      badge: 'bg-emerald-500/15 text-emerald-400',
      play: 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    long: {
      label: 'Long Break', icon: '🌴', setting: 'longMin',
      ring: 'stroke-sky-500',
      badge: 'bg-sky-500/15 text-sky-400',
      play: 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/30',
      dot: 'bg-sky-500',
    },
  };

  const RING_LEN = 2 * Math.PI * 54; // r=54 viewBox circle
  const FLUSH_MS = 15000; // credit focus time to stats at least this often (keeps "Today" live)
  const STATS_KEEP_DAYS = 14;
  const TASK_MAX = 80;
  const KEYS = { state: 'pomodoro.state', settings: 'pomodoro.settings', stats: 'pomodoro.stats', ui: 'pomodoro.ui', leader: 'pomodoro.leader' };

  // Defaults only. Nothing is read from storage at load time — these are
  // filled in by reloadSharedState() when (and only when) this tab becomes
  // the leader, so a non-leader tab performs zero storage reads and zero DOM
  // work for the lifetime of the page.
  let settings = Object.assign({}, DEFAULT_SETTINGS);
  let stats = {};
  let ui = { mode: 'card', hidden: false, pos: null };

  /* ------------------------------------------------------------------ *
   * Runtime state
   *
   * Invariant: the focus time not yet credited to `stats` is always
   * pendingFocusMs + (min(now, endsAt) - lastTick) while a focus phase runs.
   * Because that is pure timestamp arithmetic, any saved copy of S is
   * self-consistent: a tab that is closed, frozen or loses leadership never
   * has to write anything on the way out, and whoever loads S next credits
   * exactly the right amount — no loss, no double counting.
   * ------------------------------------------------------------------ */
  function durationFor(phase) { return settings[PHASES[phase].setting] * 60000; }

  function freshState() {
    const d = durationFor('focus');
    return {
      phase: 'focus', round: 1, running: false,
      duration: d, remaining: d, endsAt: 0,
      task: '', pendingFocusMs: 0, lastTick: 0,
    };
  }

  let S = freshState();

  function saveState() { store.set(KEYS.state, S); }
  function saveSettings() { store.set(KEYS.settings, settings); }
  function saveStats() { store.set(KEYS.stats, stats); }
  function saveUi() { store.set(KEYS.ui, ui); }

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  function dkey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function todayKey() { return dkey(new Date()); }

  function fmtClock(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
    return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }

  function fmtHuman(sec) {
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm';
    if (m > 0) return m + 'm';
    return sec + 's';
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  const isObj = v => v !== null && typeof v === 'object';
  const finite = Number.isFinite;
  const count = v => (finite(v) && v > 0 ? Math.round(v) : 0);

  // Pages that enforce Trusted Types (YouTube, Gmail, …) reject plain strings
  // assigned to innerHTML. Every markup string we assign is static or built
  // with esc(), so an identity policy is safe; it is created on first use.
  let ttPolicy;
  function setHTML(node, html) {
    if (ttPolicy === undefined) {
      ttPolicy = null;
      try {
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
          ttPolicy = window.trustedTypes.createPolicy('pomodoro-focus-timer', { createHTML: s => s });
        }
      } catch (e) { /* policy name not allow-listed — fall back to plain strings */ }
    }
    node.innerHTML = ttPolicy ? ttPolicy.createHTML(html) : html;
  }

  function dayStats() {
    const k = todayKey();
    if (!stats[k]) stats[k] = { focus: 0, rounds: 0, tasks: Object.create(null) };
    return stats[k];
  }

  /* ------------------------------------------------------------------ *
   * Loading (sanitised)
   * ------------------------------------------------------------------ */
  function loadSettings(raw) {
    const s = Object.assign({}, DEFAULT_SETTINGS);
    if (!isObj(raw)) return s;
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      const v = raw[k];
      if (RANGES[k]) { if (finite(v)) s[k] = clamp(Math.round(v), RANGES[k][0], RANGES[k][1]); }
      else if (typeof v === 'boolean') s[k] = v;
    }
    return s;
  }

  // Task maps are null-prototype objects, so task names such as "constructor"
  // or "__proto__" are ordinary keys instead of inherited members.
  function loadStats(raw) {
    const out = {};
    if (!isObj(raw)) return out;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STATS_KEEP_DAYS);
    const cKey = dkey(cutoff);
    for (const k of Object.keys(raw)) {
      const d = raw[k];
      if (!/^\d{4}-\d\d-\d\d$/.test(k) || k < cKey || !isObj(d)) continue;
      const tasks = Object.create(null);
      if (isObj(d.tasks)) for (const name of Object.keys(d.tasks)) { const sec = count(d.tasks[name]); if (sec) tasks[name] = sec; }
      out[k] = { focus: count(d.focus), rounds: count(d.rounds), tasks };
    }
    return out;
  }

  function loadUi(raw) {
    const r = isObj(raw) ? raw : {};
    const p = r.pos;
    return {
      mode: r.mode === 'pill' ? 'pill' : 'card',
      hidden: r.hidden === true,
      pos: isObj(p) && finite(p.left) && finite(p.top) ? { left: p.left, top: p.top } : null,
    };
  }

  function loadState(raw) {
    const s = freshState();
    if (!isObj(raw) || !Object.prototype.hasOwnProperty.call(PHASES, raw.phase)) return s;
    const now = Date.now();
    s.phase = raw.phase;
    s.round = finite(raw.round) ? clamp(Math.round(raw.round), 1, settings.rounds) : 1;
    s.duration = finite(raw.duration) && raw.duration > 0 ? Math.min(raw.duration, 180 * 60000) : durationFor(s.phase);
    s.remaining = finite(raw.remaining) ? clamp(raw.remaining, 0, s.duration) : s.duration;
    s.task = typeof raw.task === 'string' ? raw.task.slice(0, TASK_MAX) : '';
    if (raw.running === true && finite(raw.endsAt)) {
      s.running = true;
      // A clock that was moved backwards must not stretch the phase.
      s.endsAt = Math.min(raw.endsAt, now + s.duration);
      s.lastTick = finite(raw.lastTick) ? clamp(raw.lastTick, s.endsAt - s.duration, now) : now;
    }
    s.pendingFocusMs = finite(raw.pendingFocusMs) ? clamp(raw.pendingFocusMs, -1000, s.duration) : 0;
    return s;
  }

  /* ------------------------------------------------------------------ *
   * Focus-time accounting
   * ------------------------------------------------------------------ */
  // Bank the time since lastTick. Capped at endsAt, so a phase that ran out
  // while the machine slept (or no tab was leading) credits only its own
  // length, and floored at 0, so a clock moved backwards credits nothing.
  function accrue(now) {
    if (S.running && S.phase === 'focus') S.pendingFocusMs += Math.max(0, Math.min(now, S.endsAt) - S.lastTick);
    S.lastTick = now;
  }

  // Move banked time into today's stats. Whole seconds only; the sub-second
  // remainder stays pending so nothing is rounded away over many flushes.
  // S is saved alongside stats so the stored pair stays consistent.
  function flushFocus() {
    accrue(Date.now());
    const sec = Math.round(S.pendingFocusMs / 1000);
    if (sec <= 0) return;
    const d = dayStats();
    const name = S.task.trim() || 'Untracked';
    d.focus += sec;
    d.tasks[name] = (d.tasks[name] || 0) + sec;
    S.pendingFocusMs -= sec * 1000;
    saveStats();
    saveState();
  }

  /* ------------------------------------------------------------------ *
   * Sound & notifications
   * ------------------------------------------------------------------ */
  let actx = null;
  // Created/resumed from a click inside the widget so autoplay policies let
  // the completion chime play later, even from a background tab.
  function audio() {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        actx = new AC();
      }
      if (actx.state === 'suspended') Promise.resolve(actx.resume()).catch(() => {});
      return actx;
    } catch (e) {
      return null;
    }
  }

  function tone(ctx, freq, at, dur) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    const t0 = ctx.currentTime + at;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function chime(kind) {
    if (!settings.sound) return;
    const ctx = audio();
    if (!ctx) return;
    try {
      const notes = kind === 'focusDone' ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];
      notes.forEach((f, i) => tone(ctx, f, i * 0.18, i === 2 ? 0.35 : 0.18));
    } catch (e) { /* audio blocked */ }
  }

  function notify(title, text) {
    if (!settings.notify) return;
    try {
      if (typeof GM_notification !== 'undefined') {
        GM_notification({ title, text, timeout: 6000 });
      } else if ('Notification' in window) {
        const show = () => new Notification(title, { body: text });
        if (Notification.permission === 'granted') show();
        else if (Notification.permission !== 'denied') {
          Promise.resolve(Notification.requestPermission()).then(p => { if (p === 'granted') show(); }, () => {});
        }
      }
    } catch (e) { /* notifications unavailable */ }
  }

  /* ------------------------------------------------------------------ *
   * Timer engine
   *
   * The script never polls. One self-rescheduling timeout is armed only
   * while the timer runs, and only as long as it buys something:
   *   • visible tab → one wake, aligned to each second boundary (display)
   *   • hidden tab  → a single wake at the exact moment the phase ends
   *   • paused, or not the leader → no timers at all
   * Countdown math is pure timestamp arithmetic (endsAt vs Date.now()), so
   * throttled or coalesced wakeups introduce no drift.
   * ------------------------------------------------------------------ */
  let wakeTimer = null;

  function stopTicker() { if (wakeTimer !== null) { clearTimeout(wakeTimer); wakeTimer = null; } }

  function scheduleTick() {
    stopTicker();
    if (!isLeader || !S.running) return;
    const now = Date.now();
    const remaining = S.endsAt - now;
    // A hidden tab has nothing to repaint, so there is no reason to wake
    // every second — sleep right through to the moment the phase is due.
    const delay = remaining <= 0 ? 0
      : document.hidden ? remaining
      : Math.min(remaining, 1000 - (now % 1000));
    wakeTimer = setTimeout(tick, delay);
  }

  function start() {
    if (!isLeader || S.running) return;
    const now = Date.now();
    S.running = true;
    S.endsAt = now + S.remaining;
    S.lastTick = now;
    saveState();
    scheduleTick();
    render();
  }

  function pause() {
    if (!S.running) return;
    flushFocus(); // while still running, so the time since the last wake counts
    S.remaining = Math.max(0, S.endsAt - Date.now());
    S.running = false;
    S.endsAt = 0;
    stopTicker();
    saveState();
    render();
  }

  function toggle() { ensureLeader(); S.running ? pause() : start(); }

  function reset() {
    ensureLeader();
    pause();
    S.phase = 'focus';
    S.round = 1;
    S.duration = S.remaining = durationFor('focus');
    saveState();
    render();
  }

  // Move to the next phase. `completed` is false for a manual skip (no round
  // is credited); `announce` controls the chime and notification.
  function advancePhase(completed, announce) {
    flushFocus();
    const finished = S.phase;
    if (finished === 'focus') {
      if (completed) { dayStats().rounds += 1; saveStats(); }
      S.phase = S.round >= settings.rounds ? 'long' : 'short';
    } else {
      S.round = finished === 'long' ? 1 : Math.min(S.round + 1, settings.rounds);
      S.phase = 'focus';
    }
    S.duration = S.remaining = durationFor(S.phase);
    S.running = false;
    S.endsAt = 0;

    if (announce) {
      chime(finished === 'focus' ? 'focusDone' : 'breakDone');
      notify(
        finished === 'focus' ? 'Focus round complete!' : 'Break over!',
        finished === 'focus'
          ? 'Time for your ' + PHASES[S.phase].label.toLowerCase() + ' (' + Math.round(S.duration / 60000) + ' min).'
          : 'Back to focus — round ' + S.round + ' of ' + settings.rounds + '.'
      );
    }

    // The next phase always starts from *now* (never back-dated to when the
    // previous one ended), so phases cannot chain-complete in a burst.
    if (S.phase === 'focus' ? settings.autoFocus : settings.autoBreaks) start();
    else { stopTicker(); saveState(); render(); }
  }

  function skip() { ensureLeader(); advancePhase(false, false); }

  function tick() {
    wakeTimer = null;
    if (!isLeader || !S.running) return;
    const now = Date.now();
    S.remaining = Math.max(0, S.endsAt - now);
    if (S.remaining === 0) { advancePhase(true, true); return; }
    accrue(now);
    if (S.pendingFocusMs >= FLUSH_MS) flushFocus();
    // No repaint while backgrounded — the schedule already sleeps to the
    // phase boundary in that case, so this only runs when someone can see it.
    if (!document.hidden) render();
    scheduleTick();
  }

  /* ------------------------------------------------------------------ *
   * UI — markup
   * ------------------------------------------------------------------ */
  const ICONS = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-7 w-7"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-7 w-7"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    skip: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2z"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5"><path d="M17.65 6.35A8 8 0 1 0 19.73 14h-2.08a6 6 0 1 1-1.41-6.24L13 11h7V4z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zM16.2 13h2.8v6h-2.8z"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]"><path d="M5 11h14v2H5z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>',
    sub: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M19 13H5v-2h14z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
    chevUp: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>',
    chevDown: '<svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
  };

  // A typable number field flanked by +/- steppers. The field is the single
  // source of truth so clicking and typing can't drift apart.
  function stepperRow(key, label) {
    const name = label.replace(' (min)', '').toLowerCase();
    return (
        '<div class="flex items-center justify-between gap-2">' +
          '<span class="text-[13px] text-slate-300">' + label + '</span>' +
          '<div class="flex items-center gap-1.5">' +
            '<button class="pw-stepbtn" data-step="' + key + ':-1" title="Decrease" aria-label="Decrease ' + name + '">' + ICONS.sub + '</button>' +
            '<input id="pw-set-' + key + '" type="number" inputmode="numeric" min="' + RANGES[key][0] + '" max="' + RANGES[key][1] + '" aria-label="' + name + '" ' +
              'class="pw-num w-11 select-text rounded-md border border-slate-700/70 bg-slate-800/70 py-0.5 text-center text-[13px] font-semibold tabular-nums text-slate-100 outline-none focus:border-rose-500/60"/>' +
            '<button class="pw-stepbtn" data-step="' + key + ':1" title="Increase" aria-label="Increase ' + name + '">' + ICONS.plus + '</button>' +
          '</div>' +
        '</div>'
      );
    }

    function toggleRow(key, label) {
      return (
        '<label class="flex cursor-pointer items-center justify-between select-none">' +
          '<span class="text-[13px] text-slate-300">' + label + '</span>' +
          '<input type="checkbox" id="pw-tgl-' + key + '" class="peer sr-only">' +
          '<span class="relative h-5 w-9 rounded-full bg-slate-700 transition-colors peer-checked:bg-emerald-500 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-slate-400 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-white"></span>' +
        '</label>'
      );
    }

    // Built on demand (leader only) rather than at load time on every page.
    function markup() {
      return (
      '<div id="pw-wrap" class="select-none font-sans text-sm leading-normal tracking-normal text-slate-100 antialiased">' +
        '<div id="pw-card" class="w-[290px] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/50">' +

          // Header (drag handle)
          '<div id="pw-header" class="flex cursor-move items-center gap-1 border-b border-slate-800 px-3 py-2">' +
            '<span class="text-base leading-none">🍅</span>' +
            '<span class="flex-1 text-[13px] font-semibold tracking-wide text-slate-300">Pomodoro</span>' +
            '<button data-act="stats" title="Stats" aria-label="Stats" class="pw-iconbtn">' + ICONS.chart + '</button>' +
            '<button data-act="settings" title="Settings" aria-label="Settings" class="pw-iconbtn">' + ICONS.gear + '</button>' +
            '<button data-act="min" title="Minimize to pill" aria-label="Minimize to pill" class="pw-iconbtn">' + ICONS.minus + '</button>' +
            '<button data-act="hide" title="Hide (reopen from the drawer tab, bottom-left)" aria-label="Hide widget" class="pw-iconbtn">' + ICONS.chevDown + '</button>' +
          '</div>' +

          // Timer view
          '<div id="pw-view-timer" class="px-4 pb-4 pt-3">' +
            '<div class="flex items-center justify-between">' +
              '<span id="pw-phase" class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-rose-500/15 text-rose-400">Focus</span>' +
              '<span id="pw-rounds" class="text-[11px] font-medium text-slate-400">Round 1/4</span>' +
            '</div>' +
            '<div class="relative mx-auto my-3 h-44 w-44">' +
              '<svg viewBox="0 0 120 120" class="h-44 w-44 -rotate-90" aria-hidden="true">' +
                '<circle cx="60" cy="60" r="54" fill="none" stroke-width="8" class="stroke-slate-700/50"/>' +
                '<circle id="pw-ring" cx="60" cy="60" r="54" fill="none" stroke-width="8" stroke-linecap="round" class="stroke-rose-500" stroke-dasharray="' + RING_LEN.toFixed(3) + '" stroke-dashoffset="0"/>' +
              '</svg>' +
              '<div class="absolute inset-0 flex flex-col items-center justify-center">' +
                '<div id="pw-time" role="timer" class="text-3xl font-bold tabular-nums tracking-tight text-slate-50">25:00</div>' +
                '<div id="pw-state" role="status" aria-live="polite" class="mt-0.5 text-[11px] font-medium text-slate-400">Ready</div>' +
              '</div>' +
            '</div>' +
            '<input id="pw-task" type="text" placeholder="What are you working on?" maxlength="80" aria-label="Current task" ' +
              'class="mb-3 w-full select-text rounded-lg border border-slate-700/70 bg-slate-800/70 px-3 py-1.5 text-[13px] text-slate-100 placeholder-slate-500 outline-none focus:border-rose-500/60"/>' +
            '<div class="flex items-center justify-center gap-3">' +
              '<button data-act="reset" title="Reset to round 1" aria-label="Reset to round 1" class="pw-ctl">' + ICONS.reset + '</button>' +
              '<button data-act="toggle" id="pw-play" title="Start / Pause" aria-label="Start or pause" class="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-105 bg-rose-500 hover:bg-rose-400 shadow-rose-500/30">' + ICONS.play + '</button>' +
              '<button data-act="skip" title="Skip to next phase" aria-label="Skip to next phase" class="pw-ctl">' + ICONS.skip + '</button>' +
            '</div>' +
            '<div id="pw-today" class="mt-3 border-t border-slate-800 pt-2 text-center text-[11px] text-slate-400">Today: 0m focused · 0 rounds</div>' +
          '</div>' +

          // Settings view
          '<div id="pw-view-settings" class="hidden px-4 pb-4 pt-3">' +
            '<div class="mb-3 flex items-center gap-2">' +
              '<button data-act="back" title="Back" class="pw-iconbtn">' + ICONS.back + '</button>' +
              '<span class="text-[13px] font-semibold text-slate-200">Settings</span>' +
            '</div>' +
            '<div class="space-y-2.5">' +
              SETTING_ROWS.map(r => stepperRow(r[0], r[1])).join('') +
            '</div>' +
            '<div class="mt-3 space-y-2 border-t border-slate-800 pt-3">' +
              TOGGLES.map(t => toggleRow(t[0], t[1])).join('') +
            '</div>' +
            '<button id="pw-reset-settings" data-act="defaults" title="Restore the default 25/5/15 x 4 configuration" ' +
              'class="mt-3 w-full rounded-lg border border-slate-700/70 py-1.5 text-[12px] font-medium text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-slate-100">Reset settings to defaults</button>' +
            '<p class="mt-2 text-[11px] leading-relaxed text-slate-500">Changes apply immediately. A running phase keeps its current duration; new durations apply to the next phase.</p>' +
          '</div>' +

          // Stats view
          '<div id="pw-view-stats" class="hidden px-4 pb-4 pt-3">' +
            '<div class="mb-3 flex items-center gap-2">' +
              '<button data-act="back" title="Back" class="pw-iconbtn">' + ICONS.back + '</button>' +
              '<span class="flex-1 text-[13px] font-semibold text-slate-200">Stats</span>' +
              '<button data-act="clearstats" title="Clear today\'s stats" class="pw-iconbtn">' + ICONS.trash + '</button>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-2">' +
              '<div class="rounded-xl bg-slate-800/70 p-2.5 text-center">' +
                '<div id="pw-stat-focus" class="text-lg font-bold text-slate-50">0m</div>' +
                '<div class="pw-label">Focused today</div>' +
              '</div>' +
              '<div class="rounded-xl bg-slate-800/70 p-2.5 text-center">' +
                '<div id="pw-stat-rounds" class="text-lg font-bold text-slate-50">0</div>' +
                '<div class="pw-label">Rounds today</div>' +
              '</div>' +
            '</div>' +
            '<div class="pw-label mt-3">Last 7 days</div>' +
            '<div id="pw-chart" class="mt-1 flex h-24 items-end gap-1.5 rounded-xl bg-slate-800/70 p-2"></div>' +
            '<div id="pw-week-total" class="mt-1.5 text-center text-[11px] text-slate-400">This week: 0m</div>' +
            '<div class="pw-label mt-3">Tasks today</div>' +
            '<div id="pw-tasks" class="mt-1 max-h-32 space-y-1 overflow-y-auto pr-0.5"></div>' +
          '</div>' +
        '</div>' +

        // Minimized pill
        '<button id="pw-pill" class="hidden cursor-pointer items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900 px-3.5 py-1.5 text-slate-100 shadow-xl shadow-black/40">' +
          '<span id="pw-pill-dot" class="h-2 w-2 rounded-full bg-rose-500"></span>' +
          '<span id="pw-pill-time" class="text-[13px] font-semibold tabular-nums">25:00</span>' +
        '</button>' +

        // Drawer tab — fixed at the bottom-left of the viewport; toggles the widget.
        '<button id="pw-tab" title="Show Pomodoro" class="hidden fixed bottom-0 left-4 flex items-center gap-1.5 rounded-t-lg border border-b-0 border-slate-700/60 bg-slate-900 px-3 py-1.5 text-slate-400 shadow-lg shadow-black/40 transition-colors hover:bg-slate-800 hover:text-slate-100">' +
          '<span id="pw-tab-icon" class="flex items-center">' + ICONS.chevUp + '</span>' +
          '<span class="text-[11px] font-semibold tracking-wide">Pomodoro</span>' +
        '</button>' +
      '</div>'
    );
  }

  /* ------------------------------------------------------------------ *
   * UI — lazy construction
   *
   * Nothing is created until this tab actually becomes the leader, so a tab
   * showing a page the user never looks at pays nothing: no shadow root, no
   * 17 KB stylesheet parse, no markup parse, no element listeners. The one
   * dominant per-page cost of this script is therefore paid at most once per
   * browsing session, in the single tab that leads.
   * ------------------------------------------------------------------ */
  let host = null, shadow = null, el = null, $ = null;
  let built = false, buildTried = false;

  function buildUI() {
    if (buildTried) return;
    buildTried = true;
    try {
      host = document.createElement('div');
      host.id = 'pomodoro-focus-timer-host';
      // `all: initial` stops the page's inherited styles (text-transform,
      // letter-spacing, visibility, …) from leaking into the shadow tree.
      // Inline !important beats any page stylesheet rule on the host.
      host.style.setProperty('all', 'initial', 'important');
      host.style.setProperty('position', 'fixed', 'important');
      host.style.setProperty('z-index', '2147483647', 'important');
      // The host is never display:none'd — the drawer tab must stay visible.
      // Widget visibility is toggled inside the shadow root instead.
      shadow = host.attachShadow({ mode: 'open' });

      const styleEl = document.createElement('style');
      styleEl.textContent = TAILWIND_CSS;
      shadow.appendChild(styleEl);

      const container = document.createElement('div');
      setHTML(container, markup());
      shadow.appendChild(container);

      $ = sel => shadow.querySelector(sel);
      el = {
        card: $('#pw-card'), pill: $('#pw-pill'),
        phase: $('#pw-phase'), rounds: $('#pw-rounds'),
        ring: $('#pw-ring'), time: $('#pw-time'), state: $('#pw-state'),
        task: $('#pw-task'), play: $('#pw-play'), today: $('#pw-today'),
        pillDot: $('#pw-pill-dot'), pillTime: $('#pw-pill-time'),
        viewTimer: $('#pw-view-timer'), viewSettings: $('#pw-view-settings'), viewStats: $('#pw-view-stats'),
        statFocus: $('#pw-stat-focus'), statRounds: $('#pw-stat-rounds'),
        chart: $('#pw-chart'), tasks: $('#pw-tasks'), weekTotal: $('#pw-week-total'),
        tab: $('#pw-tab'), tabIcon: $('#pw-tab-icon'),
      };
      bindEvents();
      watchSiteTitle();
      (document.body || document.documentElement).appendChild(host);
      built = true;
    } catch (e) {
      // The timer, tab title and notifications keep working without a widget.
      if (host) host.remove();
      host = shadow = el = null;
    }
  }

  // A few SPAs replace document.body wholesale, which would take the widget
  // with it. Re-attaching is a cheap isConnected check on each render.
  function ensureMounted() {
    if (!host.isConnected) (document.body || document.documentElement).appendChild(host);
  }

  // Single place that positions the host: clamps into the viewport so a
  // position saved in a larger window (or another tab) is always reachable.
  // The saved position itself is left untouched.
  function place(pos, size) {
    const set = (prop, v) => host.style.setProperty(prop, v, 'important');
    if (!pos) { set('left', 'auto'); set('top', 'auto'); set('right', '20px'); set('bottom', '20px'); return; }
    const r = size || host.getBoundingClientRect();
    set('left', clamp(pos.left, 4, Math.max(4, window.innerWidth - r.width - 4)) + 'px');
    set('top', clamp(pos.top, 4, Math.max(4, window.innerHeight - r.height - 4)) + 'px');
    set('right', 'auto');
    set('bottom', 'auto');
  }

  /* ------------------------------------------------------------------ *
   * UI — rendering
   * ------------------------------------------------------------------ */
  /* render() is called on every tick, so every DOM write is guarded by a
   * change cache — a steady-state tick performs zero DOM mutations. */
  let painted = {};
  function changed(key, value) {
    if (painted[key] === value) return false;
    painted[key] = value;
    return true;
  }

  function render() {
    if (!isLeader || !built) return;
    ensureMounted();
    const timeStr = fmtClock(S.remaining);
    const p = PHASES[S.phase];

    // The tab-title countdown is independent of widget visibility, so it is
    // refreshed before any early return for a hidden widget.
    if (changed('title', timeStr + '|' + S.phase + '|' + S.task + '|' + settings.titleTimer)) renderTitle(timeStr);

    const surface = ui.hidden ? 'none' : ui.mode; // 'card' | 'pill' | 'none'
    if (surface === 'none') return;

    if (changed('phase', S.phase)) {
      el.ring.setAttribute('class', p.ring);
      el.phase.setAttribute('class', 'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ' + p.badge);
      el.phase.textContent = p.label;
      el.pillDot.setAttribute('class', 'h-2 w-2 rounded-full ' + p.dot);
    }

    // A minimized pill only shows the time.
    if (surface === 'pill') {
      if (changed('time', timeStr)) el.pillTime.textContent = timeStr;
      return;
    }
    if (changed('time', timeStr)) el.time.textContent = timeStr;

    const roundsText = 'Round ' + S.round + '/' + settings.rounds;
    if (changed('rounds', roundsText)) el.rounds.textContent = roundsText;

    const off = Math.round(RING_LEN * (1 - (S.duration ? S.remaining / S.duration : 0)) * 2) / 2;
    if (changed('ring', off)) el.ring.setAttribute('stroke-dashoffset', off.toFixed(1));

    const stateText = S.running ? (S.phase === 'focus' ? 'Focusing…' : 'Resting…') : (S.remaining === S.duration ? 'Ready' : 'Paused');
    if (changed('state', stateText)) el.state.textContent = stateText;

    if (changed('play', S.phase + '|' + S.running)) {
      setHTML(el.play, S.running ? ICONS.pause : ICONS.play);
      el.play.setAttribute('class', 'flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-105 ' + p.play);
    }

    const d = stats[todayKey()];
    const focus = d ? d.focus : 0, rounds = d ? d.rounds : 0;
    if (changed('today', focus + '|' + rounds)) el.today.textContent = 'Today: ' + fmtHuman(focus) + ' focused · ' + rounds + ' rounds';
  }

  /* ---- Tab title ----
   * `writtenTitle` is the title exactly as the browser reports it after our
   * last write. Anything else in document.title is the site's own title.
   *
   * It is read back rather than remembered because the document.title getter
   * collapses whitespace: a task like "a  b" would otherwise never compare
   * equal, be mistaken for a site change and reappended forever (the
   * MutationObserver below would spin and freeze the page). */
  let origTitle = '';
  let writtenTitle = null;

  function renderTitle(timeStr) {
    if (!isLeader) return; // only the leader owns the tab title
    const live = document.title;
    if (live !== writtenTitle) origTitle = live; // the site set (or changed) its own title
    if (!settings.titleTimer) { restoreTitle(); return; }
    const p = PHASES[S.phase];
    const task = S.task.replace(/\s+/g, ' ').trim();
    const shown = task.length > 40 ? task.slice(0, 39) + '…' : task; // keep the tab title readable
    const t = p.icon + ' ' + timeStr + ' ' + p.label + (shown ? ' · ' + shown : '') + (origTitle ? ' — ' + origTitle : '');
    if (live !== t) document.title = t;
    writtenTitle = document.title;
  }

  function restoreTitle() {
    if (writtenTitle !== null && document.title === writtenTitle) document.title = origTitle;
    writtenTitle = null;
  }

  // Re-render when the site (or an SPA) changes its title. Our own writes
  // read back equal to writtenTitle, so the observer ignores them — no
  // feedback loop. Watching <head> also survives a replaced <title> element.
  function watchSiteTitle() {
    const target = document.head || document.querySelector('title');
    if (!target) return;
    new MutationObserver(() => {
      if (isLeader && document.title !== writtenTitle) renderTitle(fmtClock(S.remaining));
    }).observe(target, { childList: true, characterData: true, subtree: true });
  }

  /* ---- Settings view ---- */
  function syncSettingsView() {
    if (!built) return;
    for (const [key] of SETTING_ROWS) {
      const input = $('#pw-set-' + key);
      // Never clobber what the user is currently typing into.
      if (input !== shadow.activeElement) input.value = settings[key];
    }
    for (const [key] of TOGGLES) $('#pw-tgl-' + key).checked = settings[key];
  }

  // Single funnel for every settings change — typed fields, +/- steppers,
  // toggle switches and "reset to defaults" all land here.
  function applySettings(patch) {
    Object.assign(settings, patch);
    // Rounds can shrink below the round already in flight; keep the readout
    // coherent ("Round 1/1", never "Round 5/3").
    S.round = Math.min(S.round, settings.rounds);
    // A phase that hasn't started yet adopts a new duration straight away.
    if (!S.running && S.remaining === S.duration) S.duration = S.remaining = durationFor(S.phase);
    saveSettings();
    saveState();
    syncSettingsView();
    render();
  }

  /* ---- Stats view ---- */
  function renderStats() {
    const today = todayKey();
    const d = stats[today] || { focus: 0, rounds: 0, tasks: {} };
    el.statFocus.textContent = fmtHuman(d.focus);
    el.statRounds.textContent = d.rounds;

    // 7-day chart
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const k = dkey(dt);
      days.push({ today: k === today, label: 'SMTWTFS'[dt.getDay()], val: stats[k] ? stats[k].focus : 0 });
    }
    const max = Math.max(60, ...days.map(x => x.val));
    setHTML(el.chart, days.map(x => {
      const h = Math.max(2, Math.round((x.val / max) * 56));
      return '<div class="flex h-full flex-1 flex-col items-center justify-end gap-1">' +
        '<div class="w-full rounded-t ' + (x.today ? 'bg-rose-500' : 'bg-slate-600') + '" style="height:' + h + 'px" title="' + fmtHuman(x.val) + '"></div>' +
        '<div class="text-[9px] ' + (x.today ? 'font-bold text-slate-300' : 'text-slate-500') + '">' + x.label + '</div>' +
      '</div>';
    }).join(''));

    el.weekTotal.textContent = 'This week: ' + fmtHuman(days.reduce((a, x) => a + x.val, 0));

    // Tasks today
    const entries = Object.entries(d.tasks).sort((a, b) => b[1] - a[1]);
    setHTML(el.tasks, entries.length
      ? entries.slice(0, 20).map(([name, sec]) =>
          '<div class="flex items-center justify-between rounded-lg bg-slate-800/70 px-2.5 py-1.5">' +
            '<span class="truncate text-[12px] text-slate-300">' + esc(name) + '</span>' +
            '<span class="ml-2 shrink-0 text-[12px] font-semibold tabular-nums text-slate-100">' + fmtHuman(sec) + '</span>' +
          '</div>'
        ).join('')
      : '<div class="rounded-lg bg-slate-800/40 px-2.5 py-2 text-center text-[12px] text-slate-500">No focus time logged yet today.</div>');
  }

  /* ---- View switching ---- */
  function showView(name) {
    if (!built) return;
    el.viewTimer.classList.toggle('hidden', name !== 'timer');
    el.viewSettings.classList.toggle('hidden', name !== 'settings');
    el.viewStats.classList.toggle('hidden', name !== 'stats');
    if (name === 'settings') syncSettingsView();
    if (name === 'stats') renderStats();
  }

  // The drawer tab is position:fixed (viewport-relative) inside the shadow root,
  // so it stays docked at the bottom-left even when the widget host is dragged
  // elsewhere — and stays visible while the widget itself is hidden. It follows
  // the leader, so there's always a handle in whichever tab you last focused.
  function applyVisibility() {
    if (!built) return;
    const surface = isLeader && !ui.hidden ? ui.mode : 'none';
    el.card.classList.toggle('hidden', surface !== 'card');
    el.pill.classList.toggle('hidden', surface !== 'pill');
    el.pill.classList.toggle('flex', surface === 'pill');
    el.tab.classList.toggle('hidden', !isLeader);
    el.tab.classList.toggle('flex', isLeader);
    setHTML(el.tabIcon, ui.hidden ? ICONS.chevUp : ICONS.chevDown);
    el.tab.setAttribute('title', ui.hidden ? 'Show Pomodoro' : 'Hide Pomodoro');
    if (isLeader) place(ui.pos); // the surface (and so its size) may have changed
    // The visible surface just changed, so the render cache is stale.
    painted = {};
    render();
  }

  function setUi(patch) {
    Object.assign(ui, patch);
    saveUi();
    applyVisibility();
  }

  /* ------------------------------------------------------------------ *
   * Cross-tab leadership — the timer runs in ONE tab only
   *
   * Storage is shared across tabs, so the tab you last focused "claims"
   * leadership by writing its id. Because all countdown and focus math is
   * based on absolute timestamps, the new leader reconstructs the exact
   * state from storage at handoff; the old leader just stops — it writes
   * nothing, so a late write from it can never clobber the new leader.
   * ------------------------------------------------------------------ */
  const MY_ID = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  let isLeader = false;

  function reloadSharedState() {
    settings = loadSettings(store.get(KEYS.settings));
    stats = loadStats(store.get(KEYS.stats));
    ui = loadUi(store.get(KEYS.ui));
    S = loadState(store.get(KEYS.state));
    // A phase that ran out while no tab was leading completes silently (it
    // was not witnessed); the next one starts from now if auto-start is on.
    if (S.running && S.endsAt <= Date.now()) advancePhase(true, false);
  }

  function becomeLeader() {
    if (isLeader) return;
    isLeader = true;
    reloadSharedState();
    buildUI();
    if (built) {
      el.task.value = S.task;
      syncSettingsView();
      applyVisibility(); // toggles the surfaces, positions, then repaints
    }
    scheduleTick();
  }

  function yieldLeadership() {
    if (!isLeader) return;
    isLeader = false;
    stopTicker();
    restoreTitle(); // hand the tab title back
    applyVisibility();
  }

  function checkLeadership() {
    const rec = store.get(KEYS.leader);
    if (isObj(rec) && rec.id === MY_ID) becomeLeader();
    else yieldLeadership();
  }

  function claimLeadership() {
    const rec = store.get(KEYS.leader);
    if (!isObj(rec) || rec.id !== MY_ID) store.set(KEYS.leader, { id: MY_ID, ts: Date.now() });
    becomeLeader();
  }

  function ensureLeader() { if (!isLeader) claimLeadership(); }

  // Cross-tab handoff — GM listeners, or the localStorage 'storage' event as
  // fallback (fires in every tab except the writer).
  if (typeof GM_addValueChangeListener !== 'undefined') {
    try {
      GM_addValueChangeListener(KEYS.leader, (k, o, v, remote) => { if (remote) checkLeadership(); });
    } catch (e) { /* older managers */ }
  } else {
    window.addEventListener('storage', e => { if (e.key === KEYS.leader) checkLeadership(); });
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) claimLeadership();
    // Visible: repaint what was skipped and resume per-second wakes.
    // Hidden: drop to a single wake at the phase end.
    if (isLeader) { render(); scheduleTick(); }
  });
  window.addEventListener('focus', claimLeadership);

  /* ------------------------------------------------------------------ *
   * Events — bound once, when the UI is built (leader only)
   * ------------------------------------------------------------------ */
  let pillDragged = false;

  function bindEvents() {
    // Keystrokes typed in the widget must not escape to the page.
    //
    // Shadow DOM retargets events to the host element, so a page's guard such
    // as `if (e.target.tagName === 'INPUT') return` never matches a field
    // inside our shadow root. The page then treats your typing as its own
    // single-key shortcut and calls preventDefault(), which swallows the
    // character — typically one specific letter, e.g. 'k' on Gmail (previous
    // conversation), YouTube (play/pause) or GitHub. Stopping propagation at
    // the shadow root keeps plain typing inside; genuine modifier combos
    // (copy/paste, undo, our Alt+Shift+T hotkey) are left to propagate.
    const shieldKeys = e => { if (!e.ctrlKey && !e.metaKey && !e.altKey) e.stopPropagation(); };
    for (const type of ['keydown', 'keypress', 'keyup']) shadow.addEventListener(type, shieldKeys);

    shadow.addEventListener('click', e => {
      if (settings.sound) audio(); // unlock audio inside a user gesture (autoplay policies)

      const stepBtn = e.target.closest('[data-step]');
      if (stepBtn) {
        const [key, delta] = stepBtn.getAttribute('data-step').split(':');
        const [lo, hi] = RANGES[key];
        applySettings({ [key]: clamp(settings[key] + Number(delta), lo, hi) });
        return;
      }

      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      switch (btn.getAttribute('data-act')) {
        case 'toggle': toggle(); break;
        case 'reset': reset(); break;
        case 'skip': skip(); break;
        case 'min': setUi({ mode: 'pill' }); break;
        case 'hide': setUi({ hidden: true }); break;
        case 'settings': showView('settings'); break;
        case 'stats': showView('stats'); break;
        case 'back': showView('timer'); break;
        case 'defaults': applySettings(DEFAULT_SETTINGS); break;
        case 'clearstats':
          if (confirm("Clear today's stats?")) {
            delete stats[todayKey()];
            saveStats();
            renderStats();
            render();
          }
          break;
      }
    });

    // Task input — credit focus time to the previous task before switching.
    el.task.addEventListener('change', () => {
      flushFocus();
      S.task = el.task.value.slice(0, TASK_MAX);
      saveState();
      render();
    });

    // Toggle switches
    for (const [key] of TOGGLES) {
      const t = $('#pw-tgl-' + key);
      t.addEventListener('change', () => {
        applySettings({ [key]: t.checked });
        if (key === 'sound' && t.checked) chime('focusDone'); // audible preview
      });
    }

    // Duration fields — typing commits on Enter or blur.
    for (const [key] of SETTING_ROWS) {
      const input = $('#pw-set-' + key);
      input.addEventListener('change', () => {
        const [lo, hi] = RANGES[key];
        const typed = Math.round(Number(input.value));
        const v = clamp(finite(typed) && typed > 0 ? typed : settings[key], lo, hi);
        input.value = v; // show the clamped value back to the user
        if (v !== settings[key]) applySettings({ [key]: v });
      });
    }

    // Enter commits a field (blur then fires `change`); Escape blurs a
    // field, or backs out of a panel.
    shadow.addEventListener('keydown', e => {
      const field = e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' ? e.target : null;
      if (e.key === 'Enter' && field) { e.preventDefault(); field.blur(); }
      else if (e.key === 'Escape') {
        if (field) field.blur();
        if (el.viewTimer.classList.contains('hidden')) showView('timer');
      }
    });

    // Pill click → expand (ignored right after a drag)
    el.pill.addEventListener('click', () => {
      if (pillDragged) { pillDragged = false; return; }
      setUi({ mode: 'card' });
    });

    // Drawer tab → show/hide the widget
    el.tab.addEventListener('click', () => setUi({ hidden: !ui.hidden }));

    makeDraggable($('#pw-header'), false);
    makeDraggable(el.pill, true);
  }

  /* ---- Dragging ---- */
  function makeDraggable(handle, isPill) {
    handle.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      if (!isPill && e.target.closest('button, input, label')) return;
      e.preventDefault();
      const rect = host.getBoundingClientRect();
      const offX = e.clientX - rect.left;
      const offY = e.clientY - rect.top;
      let moved = false;

      const onMove = ev => {
        if (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 6) moved = true;
        place({ left: ev.clientX - offX, top: ev.clientY - offY }, rect);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', onUp, true);
        if (!moved) return;
        const r = host.getBoundingClientRect();
        ui.pos = { left: Math.round(r.left), top: Math.round(r.top) };
        saveUi();
        if (isPill) pillDragged = true;
      };
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);
    });
  }

  /* ---- Hotkey & menu commands ---- */
  // Opening anything from outside the widget means the user is in this tab,
  // so it takes over first.
  function showWidget(view) {
    claimLeadership();
    setUi({ hidden: false, mode: 'card' });
    showView(view);
  }

  function toggleWidget() {
    claimLeadership();
    setUi({ hidden: !ui.hidden });
  }

  // Alt+Shift+T — avoids the browser's private-window shortcut (Ctrl/Alt+Shift+P).
  window.addEventListener('keydown', e => {
    if (e.altKey && e.shiftKey && e.code === 'KeyT' && !e.repeat) {
      e.preventDefault();
      toggleWidget();
    }
  });

  if (typeof GM_registerMenuCommand !== 'undefined') {
    try {
      GM_registerMenuCommand('▶ / ⏸  Start / Pause', toggle);
      GM_registerMenuCommand('👁  Show / Hide widget  (Alt+Shift+T)', toggleWidget);
      GM_registerMenuCommand('⏭  Skip phase', skip);
      GM_registerMenuCommand('📊  Open stats', () => showWidget('stats'));
      GM_registerMenuCommand('⚙  Open settings', () => showWidget('settings'));
    } catch (e) { /* older managers */ }
  }

  // Keep a dragged widget reachable when the window shrinks (the saved
  // position is kept, so it returns there when the window grows again).
  window.addEventListener('resize', () => { if (isLeader && built && ui.pos) place(ui.pos); });

  /* ------------------------------------------------------------------ *
   * Startup
   * ------------------------------------------------------------------ */
  // Startup performs no storage reads, builds no DOM and arms no timers. The
  // widget is created lazily by whichever tab becomes the leader, and even
  // then only in an idle slot, so it never competes with the page's own load
  // work. A background-loaded tab stays completely inert until it is focused.
  // There is deliberately no unload handler: saved state is always
  // self-consistent, and unload listeners would disable the back/forward cache.
  const idle = window.requestIdleCallback
    ? cb => window.requestIdleCallback(cb, { timeout: 300 })
    : cb => setTimeout(cb, 0);

  if (document.visibilityState === 'visible') idle(claimLeadership);
})();
