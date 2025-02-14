//    App Menu Is Back
//    GNOME Shell extension
//    @fthx 2025


import * as Main from 'resource:///org/gnome/shell/ui/main.js';


export default class AppMenuIsBackExtension {
    enable() {
        if (!Main.sessionMode.panel.left.includes('appMenu')) {
            Main.sessionMode.panel.left.push('appMenu');
            Main.panel._updatePanel();
        }
    }

    disable() {
        if (Main.sessionMode.panel.left.includes('appMenu')) {
            Main.sessionMode.panel.left.pop('appMenu');
            Main.panel._updatePanel();
        }
    }
}
