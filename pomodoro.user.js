// ==UserScript==
// @name         Pomodoro Focus Timer
// @namespace    github.com/Kritical-Dev/pomodoro-focus-timer
// @version      1.3.2
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
  const TAILWIND_CSS = "*,:after,:before{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }/*! tailwindcss v3.4.13 | MIT License | https://tailwindcss.com*/*,:after,:before{box-sizing:border-box;border:0 solid #e5e7eb}:after,:before{--tw-content:\"\"}:host,html{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;font-feature-settings:normal;font-variation-settings:normal;-webkit-tap-highlight-color:transparent}body{margin:0;line-height:inherit}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-feature-settings:normal;font-variation-settings:normal;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-feature-settings:inherit;font-variation-settings:inherit;font-size:100%;font-weight:inherit;line-height:inherit;letter-spacing:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}fieldset{margin:0}fieldset,legend{padding:0}menu,ol,ul{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{opacity:1;color:#9ca3af}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}[role=button],button{cursor:pointer}:disabled{cursor:default}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]{display:none}.pw-iconbtn{border-radius:.5rem;padding:.375rem;--tw-text-opacity:1;color:rgb(148 163 184/var(--tw-text-opacity));transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.pw-iconbtn:hover{background-color:rgba(51,65,85,.7);--tw-text-opacity:1;color:rgb(241 245 249/var(--tw-text-opacity))}.pw-ctl{display:flex;height:2.75rem;width:2.75rem;align-items:center;justify-content:center;border-radius:9999px;--tw-bg-opacity:1;background-color:rgb(30 41 59/var(--tw-bg-opacity));--tw-text-opacity:1;color:rgb(203 213 225/var(--tw-text-opacity));transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.pw-ctl:hover{--tw-bg-opacity:1;background-color:rgb(51 65 85/var(--tw-bg-opacity));--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.pw-stepbtn{display:flex;height:1.75rem;width:1.75rem;align-items:center;justify-content:center;border-radius:.375rem;background-color:rgba(51,65,85,.7);--tw-text-opacity:1;color:rgb(203 213 225/var(--tw-text-opacity));transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.pw-stepbtn:hover{--tw-bg-opacity:1;background-color:rgb(71 85 105/var(--tw-bg-opacity));--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.pw-label{font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.05em;--tw-text-opacity:1;color:rgb(148 163 184/var(--tw-text-opacity))}.pw-num{-webkit-appearance:textfield;appearance:textfield;-moz-appearance:textfield}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}.fixed{position:fixed}.absolute{position:absolute}.relative{position:relative}.inset-0{inset:0}.bottom-0{bottom:0}.left-4{left:1rem}.mx-auto{margin-left:auto;margin-right:auto}.my-3{margin-top:.75rem}.mb-3,.my-3{margin-bottom:.75rem}.ml-2{margin-left:.5rem}.mt-0\\.5{margin-top:.125rem}.mt-1{margin-top:.25rem}.mt-1\\.5{margin-top:.375rem}.mt-2{margin-top:.5rem}.mt-3{margin-top:.75rem}.flex{display:flex}.grid{display:grid}.hidden{display:none}.h-14{height:3.5rem}.h-2{height:.5rem}.h-24{height:6rem}.h-4{height:1rem}.h-44{height:11rem}.h-5{height:1.25rem}.h-7{height:1.75rem}.h-\\[18px\\]{height:18px}.h-full{height:100%}.max-h-32{max-height:8rem}.w-11{width:2.75rem}.w-14{width:3.5rem}.w-2{width:.5rem}.w-4{width:1rem}.w-44{width:11rem}.w-5{width:1.25rem}.w-7{width:1.75rem}.w-9{width:2.25rem}.w-\\[18px\\]{width:18px}.w-\\[290px\\]{width:290px}.w-full{width:100%}.flex-1{flex:1 1 0%}.shrink{flex-shrink:1}.shrink-0{flex-shrink:0}.-rotate-90{--tw-rotate:-90deg;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.cursor-move{cursor:move}.cursor-pointer{cursor:pointer}.select-none{-webkit-user-select:none;-moz-user-select:none;user-select:none}.select-text{-webkit-user-select:text;-moz-user-select:text;user-select:text}.resize{resize:both}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.flex-col{flex-direction:column}.items-end{align-items:flex-end}.items-center{align-items:center}.justify-end{justify-content:flex-end}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.gap-1{gap:.25rem}.gap-1\\.5{gap:.375rem}.gap-2{gap:.5rem}.gap-3{gap:.75rem}.space-y-1>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.25rem*(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.25rem*var(--tw-space-y-reverse))}.space-y-2>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.5rem*(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.5rem*var(--tw-space-y-reverse))}.space-y-2\\.5>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.625rem*(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.625rem*var(--tw-space-y-reverse))}.overflow-hidden{overflow:hidden}.overflow-y-auto{overflow-y:auto}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rounded-2xl{border-radius:1rem}.rounded-full{border-radius:9999px}.rounded-lg{border-radius:.5rem}.rounded-md{border-radius:.375rem}.rounded-xl{border-radius:.75rem}.rounded-t{border-top-left-radius:.25rem;border-top-right-radius:.25rem}.rounded-t-lg{border-top-left-radius:.5rem;border-top-right-radius:.5rem}.border{border-width:1px}.border-b{border-bottom-width:1px}.border-b-0{border-bottom-width:0}.border-t{border-top-width:1px}.border-slate-700\\/60{border-color:rgba(51,65,85,.6)}.border-slate-700\\/70{border-color:rgba(51,65,85,.7)}.border-slate-800{--tw-border-opacity:1;border-color:rgb(30 41 59/var(--tw-border-opacity))}.bg-emerald-500{--tw-bg-opacity:1;background-color:rgb(16 185 129/var(--tw-bg-opacity))}.bg-emerald-500\\/15{background-color:rgba(16,185,129,.15)}.bg-rose-500{--tw-bg-opacity:1;background-color:rgb(244 63 94/var(--tw-bg-opacity))}.bg-rose-500\\/15{background-color:rgba(244,63,94,.15)}.bg-sky-500{--tw-bg-opacity:1;background-color:rgb(14 165 233/var(--tw-bg-opacity))}.bg-sky-500\\/15{background-color:rgba(14,165,233,.15)}.bg-slate-600{--tw-bg-opacity:1;background-color:rgb(71 85 105/var(--tw-bg-opacity))}.bg-slate-700{--tw-bg-opacity:1;background-color:rgb(51 65 85/var(--tw-bg-opacity))}.bg-slate-800\\/40{background-color:rgba(30,41,59,.4)}.bg-slate-800\\/70{background-color:rgba(30,41,59,.7)}.bg-slate-900{--tw-bg-opacity:1;background-color:rgb(15 23 42/var(--tw-bg-opacity))}.stroke-emerald-500{stroke:#10b981}.stroke-rose-500{stroke:#f43f5e}.stroke-sky-500{stroke:#0ea5e9}.stroke-slate-700\\/50{stroke:rgba(51,65,85,.5)}.p-2{padding:.5rem}.p-2\\.5{padding:.625rem}.px-2\\.5{padding-left:.625rem;padding-right:.625rem}.px-3{padding-left:.75rem;padding-right:.75rem}.px-3\\.5{padding-left:.875rem;padding-right:.875rem}.px-4{padding-left:1rem;padding-right:1rem}.py-0\\.5{padding-top:.125rem;padding-bottom:.125rem}.py-1\\.5{padding-top:.375rem;padding-bottom:.375rem}.py-2{padding-top:.5rem;padding-bottom:.5rem}.pb-4{padding-bottom:1rem}.pr-0\\.5{padding-right:.125rem}.pt-2{padding-top:.5rem}.pt-3{padding-top:.75rem}.text-center{text-align:center}.font-sans{font-family:ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji}.text-3xl{font-size:1.875rem;line-height:2.25rem}.text-\\[11px\\]{font-size:11px}.text-\\[12px\\]{font-size:12px}.text-\\[13px\\]{font-size:13px}.text-\\[9px\\]{font-size:9px}.text-base{font-size:1rem;line-height:1.5rem}.text-lg{font-size:1.125rem;line-height:1.75rem}.text-sm{font-size:.875rem;line-height:1.25rem}.font-bold{font-weight:700}.font-medium{font-weight:500}.font-semibold{font-weight:600}.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:var(--tw-ordinal) var(--tw-slashed-zero) var(--tw-numeric-figure) var(--tw-numeric-spacing) var(--tw-numeric-fraction)}.leading-none{line-height:1}.leading-normal{line-height:1.5}.leading-relaxed{line-height:1.625}.tracking-normal{letter-spacing:0}.tracking-tight{letter-spacing:-.025em}.tracking-wide{letter-spacing:.025em}.text-emerald-400{--tw-text-opacity:1;color:rgb(52 211 153/var(--tw-text-opacity))}.text-rose-400{--tw-text-opacity:1;color:rgb(251 113 133/var(--tw-text-opacity))}.text-sky-400{--tw-text-opacity:1;color:rgb(56 189 248/var(--tw-text-opacity))}.text-slate-100{--tw-text-opacity:1;color:rgb(241 245 249/var(--tw-text-opacity))}.text-slate-200{--tw-text-opacity:1;color:rgb(226 232 240/var(--tw-text-opacity))}.text-slate-300{--tw-text-opacity:1;color:rgb(203 213 225/var(--tw-text-opacity))}.text-slate-400{--tw-text-opacity:1;color:rgb(148 163 184/var(--tw-text-opacity))}.text-slate-50{--tw-text-opacity:1;color:rgb(248 250 252/var(--tw-text-opacity))}.text-slate-500{--tw-text-opacity:1;color:rgb(100 116 139/var(--tw-text-opacity))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.antialiased{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}.placeholder-slate-500::-moz-placeholder{--tw-placeholder-opacity:1;color:rgb(100 116 139/var(--tw-placeholder-opacity))}.placeholder-slate-500::placeholder{--tw-placeholder-opacity:1;color:rgb(100 116 139/var(--tw-placeholder-opacity))}.shadow-2xl{--tw-shadow:0 25px 50px -12px rgba(0,0,0,.25);--tw-shadow-colored:0 25px 50px -12px var(--tw-shadow-color)}.shadow-2xl,.shadow-lg{box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-lg{--tw-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);--tw-shadow-colored:0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color)}.shadow-xl{--tw-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1);--tw-shadow-colored:0 20px 25px -5px var(--tw-shadow-color),0 8px 10px -6px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-black\\/40{--tw-shadow-color:rgba(0,0,0,.4);--tw-shadow:var(--tw-shadow-colored)}.shadow-black\\/50{--tw-shadow-color:rgba(0,0,0,.5);--tw-shadow:var(--tw-shadow-colored)}.shadow-emerald-500\\/30{--tw-shadow-color:rgba(16,185,129,.3);--tw-shadow:var(--tw-shadow-colored)}.shadow-rose-500\\/30{--tw-shadow-color:rgba(244,63,94,.3);--tw-shadow:var(--tw-shadow-colored)}.shadow-sky-500\\/30{--tw-shadow-color:rgba(14,165,233,.3);--tw-shadow:var(--tw-shadow-colored)}.outline-none{outline:2px solid transparent;outline-offset:2px}.blur{--tw-blur:blur(8px);filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}.transition-all{transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.transition-colors{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.pw-num::-webkit-inner-spin-button,.pw-num::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}#pw-tasks::-webkit-scrollbar{width:6px}#pw-tasks::-webkit-scrollbar-thumb{background:rgba(71,85,105,.7);border-radius:9999px}#pw-tasks::-webkit-scrollbar-track{background:transparent}#pw-wrap button:focus-visible,#pw-wrap input:focus-visible{outline:2px solid rgba(148,163,184,.9);outline-offset:2px}@media (prefers-reduced-motion:reduce){#pw-wrap *,#pw-wrap :after,#pw-wrap :before{transition-duration:.01ms!important;animation-duration:.01ms!important}#pw-wrap button:hover{transform:none!important}}.after\\:absolute:after{content:var(--tw-content);position:absolute}.after\\:left-0\\.5:after{content:var(--tw-content);left:.125rem}.after\\:top-0\\.5:after{content:var(--tw-content);top:.125rem}.after\\:h-4:after{content:var(--tw-content);height:1rem}.after\\:w-4:after{content:var(--tw-content);width:1rem}.after\\:rounded-full:after{content:var(--tw-content);border-radius:9999px}.after\\:bg-slate-400:after{content:var(--tw-content);--tw-bg-opacity:1;background-color:rgb(148 163 184/var(--tw-bg-opacity))}.after\\:transition-all:after{content:var(--tw-content);transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.hover\\:scale-105:hover{--tw-scale-x:1.05;--tw-scale-y:1.05;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.hover\\:bg-emerald-400:hover{--tw-bg-opacity:1;background-color:rgb(52 211 153/var(--tw-bg-opacity))}.hover\\:bg-rose-400:hover{--tw-bg-opacity:1;background-color:rgb(251 113 133/var(--tw-bg-opacity))}.hover\\:bg-sky-400:hover{--tw-bg-opacity:1;background-color:rgb(56 189 248/var(--tw-bg-opacity))}.hover\\:bg-slate-800:hover{--tw-bg-opacity:1;background-color:rgb(30 41 59/var(--tw-bg-opacity))}.hover\\:bg-slate-800\\/70:hover{background-color:rgba(30,41,59,.7)}.hover\\:text-slate-100:hover{--tw-text-opacity:1;color:rgb(241 245 249/var(--tw-text-opacity))}.focus\\:border-rose-500\\/60:focus{border-color:rgba(244,63,94,.6)}.peer:checked~.peer-checked\\:bg-emerald-500{--tw-bg-opacity:1;background-color:rgb(16 185 129/var(--tw-bg-opacity))}.peer:checked~.peer-checked\\:after\\:translate-x-4:after{content:var(--tw-content);--tw-translate-x:1rem;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.peer:checked~.peer-checked\\:after\\:bg-white:after{content:var(--tw-content);--tw-bg-opacity:1;background-color:rgb(255 255 255/var(--tw-bg-opacity))}";

  /* ------------------------------------------------------------------ *
   * Storage (GM_* with localStorage fallback)
   * ------------------------------------------------------------------ */
  const store = {
    get(key, fallback) {
      try {
        let raw;
        if (typeof GM_getValue !== 'undefined') raw = GM_getValue(key);
        else raw = localStorage.getItem(key);
        if (raw === undefined || raw === null) return fallback;
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        return fallback;
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
      label: 'Focus', icon: '🍅',
      ring: 'stroke-rose-500',
      badge: 'bg-rose-500/15 text-rose-400',
      play: 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/30',
      dot: 'bg-rose-500',
    },
    short: {
      label: 'Short Break', icon: '☕',
      ring: 'stroke-emerald-500',
      badge: 'bg-emerald-500/15 text-emerald-400',
      play: 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    long: {
      label: 'Long Break', icon: '🌴',
      ring: 'stroke-sky-500',
      badge: 'bg-sky-500/15 text-sky-400',
      play: 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/30',
      dot: 'bg-sky-500',
    },
  };

  const RING_LEN = 2 * Math.PI * 54; // r=54 viewBox circle
  const FLUSH_MS = 15000; // persist focus time at least this often (bounds crash loss)
  const STATS_KEEP_DAYS = 14;
  const DAYKEY_MS = 15000; // how long a cached "today" key may be reused

  // Defaults only. Nothing is read from storage at load time — these are
  // filled in by reloadSharedState() when (and only when) this tab becomes
  // the leader, so a non-leader tab performs zero storage reads and zero DOM
  // work for the lifetime of the page.
  let settings = Object.assign({}, DEFAULT_SETTINGS);
  let stats = {};
  const ui = { mode: 'card', hidden: false, pos: null };

  /* ------------------------------------------------------------------ *
   * Runtime state
   * ------------------------------------------------------------------ */
  function durationFor(phase) {
    const min = phase === 'focus' ? settings.focusMin : phase === 'short' ? settings.shortMin : settings.longMin;
    return min * 60000;
  }

  function freshState() {
    const d = durationFor('focus');
    return {
      phase: 'focus', round: 1, running: false,
      duration: d, remaining: d, endsAt: 0,
      task: '', pendingFocusMs: 0, lastTick: 0,
    };
  }

  let S = freshState();

  function saveState() { store.set('pomodoro.state', S); }
  function saveSettings() { store.set('pomodoro.settings', settings); }
  function saveStats() { store.set('pomodoro.stats', stats); }
  function saveUi() { store.set('pomodoro.ui', ui); }

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  function dkey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // Cached: render() consults this every tick, and a Date allocation plus
  // string building per tick is pure overhead. A 15 s staleness window can at
  // most misattribute a flush that straddles midnight by seconds.
  let dayKeyCache = '', dayKeyTs = 0;
  function todayKey() {
    const now = Date.now();
    if (now - dayKeyTs > DAYKEY_MS) { dayKeyTs = now; dayKeyCache = dkey(new Date()); }
    return dayKeyCache;
  }

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

  function dayStats() {
    const k = todayKey();
    if (!stats[k]) stats[k] = { focus: 0, rounds: 0, tasks: {} };
    return stats[k];
  }

  function pruneStats() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STATS_KEEP_DAYS);
    const cKey = dkey(cutoff);
    for (const k of Object.keys(stats)) if (k < cKey) delete stats[k];
  }

  /* ------------------------------------------------------------------ *
   * Focus-time accounting
   * ------------------------------------------------------------------ */
  function flushFocus() {
    if (S.running && S.phase === 'focus') {
      const now = Date.now();
      S.pendingFocusMs += now - S.lastTick;
      S.lastTick = now;
    }
    const sec = Math.round(S.pendingFocusMs / 1000);
    if (sec > 0) {
      const d = dayStats();
      d.focus += sec;
      const name = (S.task || '').trim() || 'Untracked';
      d.tasks[name] = (d.tasks[name] || 0) + sec;
      pruneStats();
      saveStats();
    }
    S.pendingFocusMs = 0;
  }

  /* ------------------------------------------------------------------ *
   * Sound & notifications
   * ------------------------------------------------------------------ */
  let actx = null;
  function tone(freq, at, dur) {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    const t0 = actx.currentTime + at;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(actx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function chime(kind) {
    if (!settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      if (kind === 'focusDone') { tone(523.25, 0, 0.18); tone(659.25, 0.18, 0.18); tone(783.99, 0.36, 0.35); }
      else { tone(783.99, 0, 0.18); tone(659.25, 0.18, 0.18); tone(523.25, 0.36, 0.35); }
    } catch (e) { /* audio blocked */ }
  }

  function notify(title, text) {
    if (!settings.notify) return;
    try {
      if (typeof GM_notification !== 'undefined') {
        GM_notification({ title, text, timeout: 6000 });
        return;
      }
      if ('Notification' in window) {
        if (Notification.permission === 'granted') new Notification(title, { body: text });
        else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(p => {
            if (p === 'granted') new Notification(title, { body: text });
          });
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
  let lastCompleteTs = 0; // when the last phase completed (real time)
  let rapidSteps = 0;     // consecutive same-instant completions (catch-up chain)

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
    S.remaining = Math.max(0, S.endsAt - Date.now());
    S.running = false;
    S.endsAt = 0;
    stopTicker();
    flushFocus();
    saveState();
    render();
  }

  function toggle() { ensureLeader(); S.running ? pause() : start(); }

  function reset() {
    ensureLeader();
    pause();
    S.phase = 'focus';
    S.round = 1;
    S.duration = durationFor('focus');
    S.remaining = S.duration;
    saveState();
    render();
  }

  // Move to the next phase. `announce` controls chime/notification.
  function advancePhase(announce) {
    flushFocus();
    const finished = S.phase;
    // Phases that elapsed while the page was frozen/discarded complete
    // back-to-back in the same instant. Those catch-up steps must not each
    // fire a chime and desktop notification, and an absurd burst of them
    // (e.g. 1-minute phases after a long sleep) parks the timer instead.
    const now = Date.now();
    const catchingUp = now - lastCompleteTs < 1000;
    rapidSteps = catchingUp ? rapidSteps + 1 : 0;
    lastCompleteTs = now;

    if (finished === 'focus') {
      dayStats().rounds += 1;
      saveStats();
      S.phase = S.round >= settings.rounds ? 'long' : 'short';
    } else {
      S.round = finished === 'long' ? 1 : S.round + 1;
      S.phase = 'focus';
    }
    S.duration = durationFor(S.phase);
    S.remaining = S.duration;
    S.running = false;
    S.endsAt = 0;

    if (announce && !catchingUp) {
      chime(finished === 'focus' ? 'focusDone' : 'breakDone');
      const p = PHASES[S.phase];
      notify(
        finished === 'focus' ? 'Focus round complete!' : 'Break over!',
        finished === 'focus'
          ? 'Time for your ' + p.label.toLowerCase() + ' (' + Math.round(S.duration / 60000) + ' min).'
          : 'Back to focus — round ' + S.round + ' of ' + settings.rounds + '.'
      );
    }

    const auto = (S.phase === 'focus' ? settings.autoFocus : settings.autoBreaks) && rapidSteps < 20;
    if (auto) start(); else { stopTicker(); saveState(); render(); }
  }

  function skip() { ensureLeader(); advancePhase(false); }

  function tick() {
    wakeTimer = null;
    if (!isLeader || !S.running) return;
    const now = Date.now();
    if (S.phase === 'focus') {
      S.pendingFocusMs += now - S.lastTick;
      if (S.pendingFocusMs >= FLUSH_MS) flushFocus();
    }
    S.lastTick = now;
    S.remaining = S.endsAt - now;
    if (S.remaining <= 0) {
      S.remaining = 0;
      advancePhase(true);
      return;
    }
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

  const HTML =
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
          '<button id="pw-reset-settings" title="Restore the default 25/5/15 x 4 configuration" ' +
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
    '</div>';

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
  let built = false;

  function buildUI() {
    if (built) return;
    built = true;

    host = document.createElement('div');
    host.id = 'pomodoro-focus-timer-host';
    shadow = host.attachShadow({ mode: 'open' });

    const st = host.style;
    st.setProperty('position', 'fixed', 'important');
    st.setProperty('z-index', '2147483647', 'important');
    if (ui.pos && typeof ui.pos.left === 'number') {
      st.setProperty('left', ui.pos.left + 'px', 'important');
      st.setProperty('top', ui.pos.top + 'px', 'important');
    } else {
      st.setProperty('right', '20px', 'important');
      st.setProperty('bottom', '20px', 'important');
    }
    // The host is never display:none'd — the drawer tab must stay visible.
    // Widget visibility is toggled inside the shadow root instead.

    const styleEl = document.createElement('style');
    styleEl.textContent = TAILWIND_CSS;
    shadow.appendChild(styleEl);

    const container = document.createElement('div');
    container.innerHTML = HTML;
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
    el.task.value = S.task || '';
    watchSiteTitle();
    bindEvents();
    (document.body || document.documentElement).appendChild(host);
  }

  // A few SPAs replace document.body wholesale, which would take the widget
  // with it. Re-attaching is a cheap isConnected check on each render.
  function ensureMounted() {
    if (!built || host.isConnected) return;
    (document.body || document.documentElement).appendChild(host);
  }

  /* ------------------------------------------------------------------ *
   * UI — rendering
   * ------------------------------------------------------------------ */
  /* render() is called on every tick, so every DOM write is guarded by a
   * change cache — a steady-state tick performs zero DOM mutations. */
  let lastTimeStr = '', lastTitleKey = '', lastPhaseKey = '', lastPlayKey = '';
  let lastStateText = '', lastRoundsText = '', lastOffset = -1;
  let lastFooterFocus = -1, lastFooterRounds = -1;

  function resetRenderCaches() {
    lastTimeStr = lastTitleKey = lastPhaseKey = lastPlayKey = lastStateText = lastRoundsText = '';
    lastOffset = -1;
    lastFooterFocus = lastFooterRounds = -1;
  }

  function render() {
    if (!isLeader || !built) return;
    ensureMounted();

    const surface = ui.hidden ? 'none' : ui.mode; // 'card' | 'pill' | 'none'
    const timeStr = fmtClock(S.remaining);

    // The tab-title countdown is independent of widget visibility, so it is
    // refreshed before any early return for a hidden widget.
    const titleKey = timeStr + '|' + S.phase + '|' + (S.task || '');
    if (titleKey !== lastTitleKey) {
      lastTitleKey = titleKey;
      renderTitle(timeStr);
    }

    if (surface === 'none') return;

    if (timeStr !== lastTimeStr) {
      lastTimeStr = timeStr;
      if (surface === 'card') el.time.textContent = timeStr;
      else el.pillTime.textContent = timeStr;
    }

    // Phase styling changes once per phase — cheap either way.
    if (S.phase !== lastPhaseKey) {
      const p = PHASES[S.phase];
      lastPhaseKey = S.phase;
      el.ring.setAttribute('class', p.ring);
      el.phase.setAttribute('class', 'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ' + p.badge);
      el.phase.textContent = p.label;
      el.pillDot.setAttribute('class', 'h-2 w-2 rounded-full ' + p.dot);
    }

    // Everything below is only drawn on the card; a minimized pill is done.
    if (surface !== 'card') return;
    const p = PHASES[S.phase];

    const roundsText = 'Round ' + S.round + '/' + settings.rounds;
    if (roundsText !== lastRoundsText) {
      lastRoundsText = roundsText;
      el.rounds.textContent = roundsText;
    }

    const off = Math.round(RING_LEN * (1 - (S.duration ? S.remaining / S.duration : 0)) * 2) / 2;
    if (off !== lastOffset) {
      lastOffset = off;
      el.ring.setAttribute('stroke-dashoffset', off.toFixed(1));
    }

    const stateText = S.running ? (S.phase === 'focus' ? 'Focusing…' : 'Resting…') : (S.remaining === S.duration ? 'Ready' : 'Paused');
    if (stateText !== lastStateText) {
      lastStateText = stateText;
      el.state.textContent = stateText;
    }

    const playKey = S.phase + '|' + S.running;
    if (playKey !== lastPlayKey) {
      lastPlayKey = playKey;
      el.play.innerHTML = S.running ? ICONS.pause : ICONS.play;
      el.play.setAttribute('class', 'flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-105 ' + p.play);
    }

    // Compare the underlying numbers so the string is only built on change.
    const d = stats[todayKey()];
    const focus = d ? d.focus : 0, rounds = d ? d.rounds : 0;
    if (focus !== lastFooterFocus || rounds !== lastFooterRounds) {
      lastFooterFocus = focus;
      lastFooterRounds = rounds;
      el.today.textContent = 'Today: ' + fmtHuman(focus) + ' focused · ' + rounds + ' rounds';
    }
  }

  /* ---- Tab title ----
   * `writtenTitle` records the exact string we last wrote. MutationObserver
   * callbacks are microtasks (delivered after the current stack unwinds), so
   * a boolean "currently writing" flag cannot work — comparing the live title
   * against writtenTitle synchronously is what prevents our own write from
   * being mistaken for a site title change and reappended forever. */
  let origTitle = document.title;
  let writtenTitle = null;

  function renderTitle(timeStr) {
    if (!isLeader) return; // only the leader owns the tab title
    if (!settings.titleTimer) { restoreTitle(); return; }
    const p = PHASES[S.phase];
    const task = (S.task || '').trim();
    const shown = task.length > 40 ? task.slice(0, 39) + '…' : task; // keep the tab title readable
    const t = p.icon + ' ' + timeStr + ' ' + p.label + (shown ? ' · ' + shown : '') + (origTitle ? ' — ' + origTitle : '');
    if (document.title !== t) { writtenTitle = t; document.title = t; }
  }

  function restoreTitle() {
    if (writtenTitle !== null && document.title === writtenTitle) document.title = origTitle;
    writtenTitle = null;
  }

  // Keep origTitle in sync when the site (or an SPA) changes its own title.
  // Our writes are recognised because they equal writtenTitle, so the
  // observer never reacts to them — no feedback loop. Registered only once
  // this tab leads (non-leader tabs never touch the title).
  function watchSiteTitle() {
    const titleEl = document.querySelector('title');
    if (!titleEl) return;
    new MutationObserver(() => {
      if (document.title === writtenTitle || document.title === origTitle) return;
      origTitle = document.title;
      renderTitle(fmtClock(S.remaining));
    }).observe(titleEl, { childList: true, characterData: true, subtree: true });
  }

  /* ---- Settings view ---- */
  function syncSettingsView() {
    if (!el) return;
    for (const [key] of SETTING_ROWS) {
      const input = $('#pw-set-' + key);
      // Never clobber what the user is currently typing into.
      if (input && input !== shadow.activeElement) input.value = settings[key];
    }
    for (const [key] of TOGGLES) {
      const t = $('#pw-tgl-' + key);
      if (t) t.checked = !!settings[key];
    }
  }

  // Single funnel for every settings change — typed fields, +/- steppers and
  // the toggle switches all land here, so behaviour can't diverge.
  function applySetting(key, value) {
    settings[key] = value;
    // Rounds can shrink below the round already in flight; keep the readout
    // coherent ("Round 1/1", never "Round 5/3").
    if (key === 'rounds' && S.round > value) S.round = value;
    saveSettings();
    syncSettingsView();
    // A phase that hasn't started yet adopts a new duration straight away.
    if (key !== 'rounds' && !S.running && S.remaining === S.duration) {
      S.duration = durationFor(S.phase);
      S.remaining = S.duration;
      saveState();
    }
    render();
    if (key === 'titleTimer') renderTitle(fmtClock(S.remaining));
    if (key === 'sound' && value) chime('focusDone'); // audible preview
  }

  /* ---- Stats view ---- */
  function renderStats() {
    const d = stats[todayKey()] || { focus: 0, rounds: 0, tasks: {} };
    el.statFocus.textContent = fmtHuman(d.focus);
    el.statRounds.textContent = d.rounds;

    // 7-day chart
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const k = dkey(dt);
      days.push({ key: k, label: 'SMTWTFS'[dt.getDay()], val: stats[k] ? stats[k].focus : 0 });
    }
    const max = Math.max(60, ...days.map(x => x.val));
    el.chart.innerHTML = days.map(x => {
      const h = Math.max(2, Math.round((x.val / max) * 56));
      const isToday = x.key === todayKey();
      return '<div class="flex h-full flex-1 flex-col items-center justify-end gap-1">' +
        '<div class="w-full rounded-t ' + (isToday ? 'bg-rose-500' : 'bg-slate-600') + '" style="height:' + h + 'px" title="' + fmtHuman(x.val) + '"></div>' +
        '<div class="text-[9px] ' + (isToday ? 'font-bold text-slate-300' : 'text-slate-500') + '">' + x.label + '</div>' +
      '</div>';
    }).join('');

    el.weekTotal.textContent = 'This week: ' + fmtHuman(days.reduce((a, x) => a + x.val, 0));

    // Tasks today
    const entries = Object.entries(d.tasks || {}).sort((a, b) => b[1] - a[1]);
    el.tasks.innerHTML = entries.length
      ? entries.slice(0, 20).map(([name, sec]) =>
          '<div class="flex items-center justify-between rounded-lg bg-slate-800/70 px-2.5 py-1.5">' +
            '<span class="truncate text-[12px] text-slate-300">' + esc(name) + '</span>' +
            '<span class="ml-2 shrink-0 text-[12px] font-semibold tabular-nums text-slate-100">' + fmtHuman(sec) + '</span>' +
          '</div>'
        ).join('')
      : '<div class="rounded-lg bg-slate-800/40 px-2.5 py-2 text-center text-[12px] text-slate-500">No focus time logged yet today.</div>';
  }

  /* ---- View switching ---- */
  function showView(name) {
    el.viewTimer.classList.toggle('hidden', name !== 'timer');
    el.viewSettings.classList.toggle('hidden', name !== 'settings');
    el.viewStats.classList.toggle('hidden', name !== 'stats');
    if (name === 'settings') syncSettingsView();
    if (name === 'stats') renderStats();
  }

  // The drawer tab is position:fixed (viewport-relative) inside the shadow root,
  // so it stays docked at the bottom-left even when the widget host is dragged
  // elsewhere — and stays visible while the widget itself is hidden.
  function applyVisibility() {
    if (!built) return;
    const showCard = isLeader && !ui.hidden && ui.mode === 'card';
    const showPill = isLeader && !ui.hidden && ui.mode === 'pill';
    el.card.classList.toggle('hidden', !showCard);
    el.pill.classList.toggle('hidden', !showPill);
    el.pill.classList.toggle('flex', showPill);
    // The drawer tab follows the leader too — it appears in whichever tab you
    // last focused, so there's always a handle to open the widget.
    el.tab.classList.toggle('hidden', !isLeader);
    el.tab.classList.toggle('flex', isLeader);
    el.tabIcon.innerHTML = ui.hidden ? ICONS.chevUp : ICONS.chevDown;
    el.tab.setAttribute('title', ui.hidden ? 'Show Pomodoro' : 'Hide Pomodoro');
    // The visible surface just changed, so the per-surface render caches are
    // stale; refresh them and repaint in one go for callers.
    resetRenderCaches();
    render();
  }

  function setMode(mode) {
    ui.mode = mode;
    saveUi();
    applyVisibility();
  }

  function setHidden(hidden) {
    ui.hidden = hidden;
    saveUi();
    applyVisibility();
  }

  function toggleHidden() { setHidden(!ui.hidden); }

  /* ------------------------------------------------------------------ *
   * Cross-tab leadership — the timer runs in ONE tab only
   *
   * Storage is shared across tabs, so the tab you last focused "claims"
   * leadership by writing its id. Because all countdown math is based on
   * absolute timestamps (endsAt vs Date.now()), the new leader can
   * reconstruct the exact timer state from storage at handoff — no tab
   * needs to keep a live count, and non-leader tabs hold zero timers.
   * ------------------------------------------------------------------ */
  const MY_ID = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const LEADER_KEY = 'pomodoro.leader';
  let isLeader = false;

  function reloadSharedState() {
    settings = Object.assign({}, DEFAULT_SETTINGS, store.get('pomodoro.settings', {}));
    stats = store.get('pomodoro.stats', {});
    Object.assign(ui, { mode: 'card', hidden: false, pos: null }, store.get('pomodoro.ui', {}));
    const saved = store.get('pomodoro.state', null);
    S = (saved && PHASES[saved.phase] && typeof saved.remaining === 'number')
      ? Object.assign(freshState(), saved)
      : freshState();
    // Fast-forward through any phases that expired while no leader was around.
    if (S.running) {
      let guard = 0;
      while (S.running && S.endsAt <= Date.now() && guard++ < 12) advancePhase(false);
      if (guard >= 12) { S.running = false; S.remaining = S.duration; }
      if (S.running) S.lastTick = Date.now();
      saveState();
    }
  }

  function becomeLeader() {
    if (isLeader) return;
    isLeader = true;
    // Re-read the site's own title every time we take over, so a tab that
    // yielded and is claiming again never inherits a stale reference.
    origTitle = document.title;
    writtenTitle = null;
    reloadSharedState();
    if (!built) buildUI();
    el.task.value = S.task || '';
    syncSettingsView();
    applyVisibility(); // toggles the surfaces, then repaints
    if (S.running) scheduleTick();
    if (settings.notify && typeof GM_notification === 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      // Pre-ask so the first completion isn't silent (browser fallback only).
      Notification.requestPermission().catch(() => {});
    }
  }

  function yieldLeadership() {
    if (!isLeader) return;
    // Leave the freshest possible state behind for the next leader.
    if (S.running) flushFocus();
    saveState();
    isLeader = false;
    stopTicker();
    restoreTitle(); // hand the tab title back
    applyVisibility();
  }

  function checkLeadership() {
    const rec = store.get(LEADER_KEY, null);
    if (rec && rec.id === MY_ID) becomeLeader();
    else yieldLeadership();
  }

  let lastClaimTs = 0;
  function claimLeadership() {
    const now = Date.now();
    // Already leading and recently confirmed — the common case for the
    // repeated focus events — so skip both the storage read and the write.
    if (isLeader && now - lastClaimTs < 5000) return;
    const rec = store.get(LEADER_KEY, null);
    if (!rec || rec.id !== MY_ID || now - rec.ts > 5000) {
      store.set(LEADER_KEY, { id: MY_ID, ts: now });
    }
    lastClaimTs = now;
    becomeLeader();
  }

  function ensureLeader() { if (!isLeader) claimLeadership(); }

  // Cross-tab change propagation — GM listeners, or the localStorage
  // 'storage' event as fallback (fires in every tab except the writer).
  if (typeof GM_addValueChangeListener !== 'undefined') {
    try {
      GM_addValueChangeListener(LEADER_KEY, (k, o, v, remote) => { if (remote) checkLeadership(); });
      GM_addValueChangeListener('pomodoro.ui', (k, o, v, remote) => {
        if (!remote) return;
        try { Object.assign(ui, JSON.parse(v)); } catch (e) {}
        applyVisibility();
      });
    } catch (e) { /* older managers */ }
  } else {
    window.addEventListener('storage', e => {
      if (e.key === LEADER_KEY) checkLeadership();
      else if (e.key === 'pomodoro.ui') {
        try { Object.assign(ui, JSON.parse(e.newValue)); } catch (err) {}
        applyVisibility();
      }
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      claimLeadership(); // cheap no-op when this tab already leads
      if (isLeader) { resetRenderCaches(); render(); scheduleTick(); }
    } else {
      // Backgrounded: stop the per-second repaint and sleep to the phase end.
      scheduleTick();
    }
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
    const shieldKeys = e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.stopPropagation();
    };
    for (const type of ['keydown', 'keypress', 'keyup']) shadow.addEventListener(type, shieldKeys);

    shadow.addEventListener('click', e => {
      // Unlock audio on first interaction (autoplay policies).
      if (actx && actx.state === 'suspended') actx.resume();

      const stepBtn = e.target.closest('[data-step]');
      if (stepBtn) {
        const [key, delta] = stepBtn.getAttribute('data-step').split(':');
        const [lo, hi] = RANGES[key];
        applySetting(key, clamp(settings[key] + Number(delta), lo, hi));
        return;
      }

      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      switch (btn.getAttribute('data-act')) {
        case 'toggle': toggle(); break;
        case 'reset': reset(); break;
        case 'skip': skip(); break;
        case 'min': setMode('pill'); break;
        case 'hide': setHidden(true); break;
        case 'settings': showView('settings'); break;
        case 'stats': showView('stats'); break;
        case 'back': showView('timer'); break;
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

    // Task input — flush current focus time to the previous task before switching.
    el.task.addEventListener('change', () => {
      flushFocus();
      S.task = el.task.value;
      saveState();
      render();
    });

    // Toggle switches
    for (const [key] of TOGGLES) {
      const t = $('#pw-tgl-' + key);
      t.addEventListener('change', () => applySetting(key, t.checked));
    }

    // Duration fields — typing commits on Enter or blur.
    for (const [key] of SETTING_ROWS) {
      const input = $('#pw-set-' + key);
      const commit = () => {
        const [lo, hi] = RANGES[key];
        const typed = Math.round(Number(input.value));
        const v = clamp(Number.isFinite(typed) && typed > 0 ? typed : settings[key], lo, hi);
        input.value = v; // show the clamped value back to the user
        if (v !== settings[key]) applySetting(key, v);
      };
      input.addEventListener('change', commit);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        else if (e.key === 'Escape') input.blur();
      });
    }

    // Reset every setting back to the shipped defaults.
    $('#pw-reset-settings').addEventListener('click', () => {
      Object.assign(settings, DEFAULT_SETTINGS);
      if (S.round > settings.rounds) S.round = settings.rounds;
      saveSettings();
      syncSettingsView();
      if (!S.running && S.remaining === S.duration) {
        S.duration = durationFor(S.phase);
        S.remaining = S.duration;
        saveState();
      }
      render();
      renderTitle(fmtClock(S.remaining));
    });

    // Enter in the task field commits it (blur then fires `change`).
    el.task.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); el.task.blur(); }
    });

    // Escape backs out of a panel.
    shadow.addEventListener('keydown', e => {
      if (e.key === 'Escape' && el.viewTimer.classList.contains('hidden')) showView('timer');
    });

    // Pill click → expand (ignored right after a drag)
    el.pill.addEventListener('click', () => {
      if (pillDragged) { pillDragged = false; return; }
      setMode('card');
    });

    // Drawer tab → show/hide the widget
    el.tab.addEventListener('click', toggleHidden);

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
        const w = rect.width, h = rect.height;
        const left = clamp(ev.clientX - offX, 4, window.innerWidth - w - 4);
        const top = clamp(ev.clientY - offY, 4, window.innerHeight - h - 4);
        if (Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 6) moved = true;
        host.style.setProperty('left', left + 'px', 'important');
        host.style.setProperty('top', top + 'px', 'important');
        host.style.setProperty('right', 'auto', 'important');
        host.style.setProperty('bottom', 'auto', 'important');
      };
      const onUp = ev => {
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        if (moved) {
          const r = host.getBoundingClientRect();
          ui.pos = { left: Math.round(r.left), top: Math.round(r.top) };
          saveUi();
          if (isPill) pillDragged = true;
        }
      };
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
    });
  }

  /* ---- Hotkey & menu commands ---- */
  // Alt+Shift+T — avoids the browser's private-window shortcut (Ctrl/Alt+Shift+P).
  window.addEventListener('keydown', e => {
    if (e.altKey && e.shiftKey && e.code === 'KeyT') {
      e.preventDefault();
      claimLeadership(); // the user is here — this tab should run the widget
      toggleHidden();
    }
  });

  // Open a panel from the Tampermonkey menu — this tab takes over and un-hides.
  function openPanel(view) {
    claimLeadership();
    setHidden(false);
    setMode('card');
    showView(view);
  }

  if (typeof GM_registerMenuCommand !== 'undefined') {
    try {
      GM_registerMenuCommand('▶ / ⏸  Start / Pause', () => { ensureLeader(); toggle(); });
      GM_registerMenuCommand('👁  Show / Hide widget  (Alt+Shift+T)', () => { claimLeadership(); toggleHidden(); });
      GM_registerMenuCommand('⏭  Skip phase', () => { ensureLeader(); skip(); });
      GM_registerMenuCommand('📊  Open stats', () => openPanel('stats'));
      GM_registerMenuCommand('⚙  Open settings', () => openPanel('settings'));
    } catch (e) { /* older managers */ }
  }

  // Keep a dragged widget reachable when the window shrinks.
  window.addEventListener('resize', () => {
    if (!built || !ui.pos) return;
    const r = host.getBoundingClientRect();
    const left = clamp(ui.pos.left, 4, Math.max(4, window.innerWidth - r.width - 4));
    const top = clamp(ui.pos.top, 4, Math.max(4, window.innerHeight - r.height - 4));
    if (left === ui.pos.left && top === ui.pos.top) return;
    ui.pos = { left, top };
    saveUi();
    host.style.setProperty('left', left + 'px', 'important');
    host.style.setProperty('top', top + 'px', 'important');
  });

  window.addEventListener('beforeunload', () => { if (isLeader) { flushFocus(); saveState(); } });

  /* ------------------------------------------------------------------ *
   * Startup
   * ------------------------------------------------------------------ */
  // Startup performs no storage reads, builds no DOM and arms no timers. The
  // widget is created lazily by whichever tab becomes the leader, and even
  // then only in an idle slot, so it never competes with the page's own load
  // work. A background-loaded tab stays completely inert until it is focused.
  const idle = window.requestIdleCallback
    ? cb => window.requestIdleCallback(cb, { timeout: 300 })
    : cb => setTimeout(cb, 0);

  if (document.visibilityState === 'visible') idle(claimLeadership);
})();
