//    App Menu Is Back
//    GNOME Shell extension
//    @fthx 2025


import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';


export default class AppMenuIsBackExtension {
    _shiftPlacesMenu() {
        this._timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            let placesIndicator = Main.panel.statusArea['places-menu'];

            if (placesIndicator) {
                Main.panel._leftBox.remove_child(placesIndicator.container);
                Main.panel._leftBox.insert_child_at_index(placesIndicator.container, 1);
            }

            this._timeout = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    enable() {
        if (!Main.sessionMode.panel.left.includes('appMenu')) {
            Main.sessionMode.panel.left.push('appMenu');
            Main.panel._updatePanel();

            Main.panel.statusArea.appMenu._container.remove_child(Main.panel.statusArea.appMenu._spinner);
        }

        this._shiftPlacesMenu();
    }

    disable() {
        if (Main.sessionMode.panel.left.includes('appMenu')) {
            Main.sessionMode.panel.left.pop();
            Main.panel._updatePanel();

            Main.panel.statusArea.appMenu._container.add_child(Main.panel.statusArea.appMenu._spinner);
            Main.panel.statusArea.appMenu?.destroy();
        }

        this._shiftPlacesMenu();

        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
        }
    }
}
