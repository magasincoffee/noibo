/* MAGASIN — SCHEDULE V2 BOOT
 * Loaded after the stable schedule partial so the new UX becomes the active
 * schedule implementation without changing the existing auth/session layer.
 */
(function(window){
  'use strict';
  function activate(){
    if (typeof window.renderEmployeeScheduleV2_ === 'function') {
      window.renderEmployeeSchedule_ = window.renderEmployeeScheduleV2_;
    }
    if (typeof window.renderScheduleV2_ === 'function') {
      window.renderSchedule_ = window.renderScheduleV2_;
    }
  }
  activate();
  window.setTimeout(activate, 0);
})(window);
