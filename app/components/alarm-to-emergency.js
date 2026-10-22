(function () {
  "use strict";

  /**
   * Open the shared「新建应急事件」wizard from an alarm list page.
   * Mutates alarm objects on save: status→处理中, transferStatus→已转单, workOrderNo→eventId.
   */
  window.openAlarmEmergencyTransfer = function openAlarmEmergencyTransfer(alarms, options = {}) {
    const list = (Array.isArray(alarms) ? alarms : [alarms]).filter(Boolean);
    if (!list.length) return;
    const ops = window.EMERGENCY_EVENT_OPS;
    if (!ops?.openCreate || !ops?.draftFromAlarm) {
      window.alert("应急事件组件未加载");
      return;
    }
    ops.openCreate({
      prefill: ops.draftFromAlarm(list[0]),
      source: options.source || "报警中心",
      hidePointPicker: true,
      fromAlarms: list,
      onSaved: (events) => {
        const stamp = new Date().toISOString().slice(0, 19).replace("T", " ");
        list.forEach((alarm, index) => {
          const event = events[index] || events[0];
          if (!event) return;
          alarm.status = "处理中";
          alarm.transferStatus = "已转单";
          alarm.emergencyEventId = event.eventId;
          alarm.workOrderNo = event.eventId;
          alarm.transferTime = stamp;
          alarm.history = [...(alarm.history || []), {
            time: stamp,
            operator: "当前用户",
            action: `已转应急事件，事件编号 ${event.eventId}`,
          }];
        });
        if (typeof options.onSaved === "function") options.onSaved(events, list);
      },
    });
  };
})();
