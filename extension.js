//    App Menu Is Back
//    GNOME Shell extension
//    @fthx 2024
//    Almost all the code comes from GS 44 original code


import Atk from 'gi://Atk';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as Animation from 'resource:///org/gnome/shell/ui/animation.js';
import * as AppMenu from 'resource:///org/gnome/shell/ui/appMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Overview from 'resource:///org/gnome/shell/ui/overview.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const PANEL_ICON_SIZE = 16;
const APP_MENU_ICON_MARGIN = 0;


const AppMenuButton = GObject.registerClass({
    Signals: { 'changed': {} },
}, class AppMenuButton extends PanelMenu.Button {
    _init() {
        super._init(0.0, null, true);

        this.accessible_role = Atk.Role.MENU;

        this._startingApps = [];

        this._menuManager = Main.panel.menuManager;
        this._targetApp = null;

        let bin = new St.Bin({ name: 'appMenu' });
        this.add_child(bin);

        this.bind_property("reactive", this, "can-focus", 0);
        this.reactive = false;

        this._container = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        bin.set_child(this._container);

        let textureCache = St.TextureCache.get_default();
        textureCache.connect('icon-theme-changed',
                             this._onIconThemeChanged.bind(this));

        let iconEffect = new Clutter.DesaturateEffect();
        this._iconBox = new St.Bin({
            style_class: 'app-menu-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._iconBox.add_effect(iconEffect);
        this._container.add_child(this._iconBox);

        this._iconBox.connect('style-changed', () => {
            let themeNode = this._iconBox.get_theme_node();
            iconEffect.enabled = themeNode.get_icon_style() == St.IconStyle.SYMBOLIC;
        });

        this._label = new St.Label({
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._container.add_child(this._label);

        this._visible = !Main.overview.visible;
        if (!this._visible)
            this.hide();
        Main.overview.connectObject(
            'hiding', this._sync.bind(this),
            'showing', this._sync.bind(this), this);

        this._spinner = new Animation.Spinner(PANEL_ICON_SIZE, {
            animate: true,
            hideOnStop: true,
        });
        this._container.add_child(this._spinner);

        let menu = new AppMenu.AppMenu(this);
        this.setMenu(menu);
        this._menuManager.addMenu(menu);

        Shell.WindowTracker.get_default().connectObject('notify::focus-app',
            this._focusAppChanged.bind(this), this);
        Shell.AppSystem.get_default().connectObject('app-state-changed',
            this._onAppStateChanged.bind(this), this);
        global.window_manager.connectObject('switch-workspace',
            this._sync.bind(this), this);

        this._sync();
    }

    fadeIn() {
        if (this._visible)
            return;

        this._visible = true;
        this.reactive = true;
        this.remove_all_transitions();
        this.ease({
            opacity: 255,
            duration: Overview.ANIMATION_TIME,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    fadeOut() {
        if (!this._visible)
            return;

        this._visible = false;
        this.reactive = false;
        this.remove_all_transitions();
        this.ease({
            opacity: 0,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            duration: Overview.ANIMATION_TIME,
        });
    }

    _syncIcon(app) {
        const icon = app.create_icon_texture(PANEL_ICON_SIZE - APP_MENU_ICON_MARGIN);
        this._iconBox.set_child(icon);
    }

    _onIconThemeChanged() {
        if (this._iconBox.child == null)
            return;

        if (this._targetApp)
            this._syncIcon(this._targetApp);
    }

    stopAnimation() {
        this._spinner.stop();
    }

    startAnimation() {
        this._spinner.play();
    }

    _onAppStateChanged(appSys, app) {
        let state = app.state;
        if (state != Shell.AppState.STARTING)
            this._startingApps = this._startingApps.filter(a => a != app);
        else if (state == Shell.AppState.STARTING)
            this._startingApps.push(app);
        this._sync();
    }

    _focusAppChanged() {
        let tracker = Shell.WindowTracker.get_default();
        let focusedApp = tracker.focus_app;
        if (!focusedApp) {
            if (global.stage.key_focus != null)
                return;
        }
        this._sync();
    }

    _findTargetApp() {
        let workspaceManager = global.workspace_manager;
        let workspace = workspaceManager.get_active_workspace();
        let tracker = Shell.WindowTracker.get_default();
        let focusedApp = tracker.focus_app;
        if (focusedApp && focusedApp.is_on_workspace(workspace))
            return focusedApp;

        for (let i = 0; i < this._startingApps.length; i++) {
            if (this._startingApps[i].is_on_workspace(workspace))
                return this._startingApps[i];
        }

        return null;
    }

    _sync() {
        let targetApp = this._findTargetApp();

        if (this._targetApp != targetApp) {
            this._targetApp?.disconnectObject(this);

            this._targetApp = targetApp;

            if (this._targetApp) {
                this._targetApp.connectObject('notify::busy', this._sync.bind(this), this);
                this._label.set_text(this._targetApp.get_name());
                this.set_accessible_name(this._targetApp.get_name());

                this._syncIcon(this._targetApp);
            }
        }

        let visible = this._targetApp != null && !Main.overview.visibleTarget;
        if (visible)
            this.fadeIn();
        else
            this.fadeOut();

        let isBusy = this._targetApp != null &&
                      (this._targetApp.get_state() == Shell.AppState.STARTING ||
                       this._targetApp.get_busy());
        if (isBusy)
            this.startAnimation();
        else
            this.stopAnimation();

        this.reactive = visible && !isBusy;

        this.menu.setApp(this._targetApp);
        this.emit('changed');
    }
});

export default class AppMenuIsBackExtension {
    enable() {
        this._app_menu = new AppMenuButton();
        Main.panel.addToStatusArea('appmenu-indicator', this._app_menu, -1, 'left');
    }

    disable() {
        Main.panel.menuManager.removeMenu(this._app_menu.menu);
        this._app_menu.menu = null;

        this._app_menu.destroy();
        delete this._app_menu;
    }
}
