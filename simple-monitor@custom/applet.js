const Applet = imports.ui.applet;
const Mainloop = imports.mainloop;
const GTop = imports.gi.GTop;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

class SimpleMonitorApplet extends Applet.TextApplet {
    constructor(metadata, orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);

    	this.actor.style = "font-size: 12px;"
        this.last_cpu_total = 0;
        this.last_cpu_idle = 0;
        this.temp_path = this._get_cpu_sensor_path();

        this._update();
    }

    _get_cpu_sensor_path() {
        for (let i = 0; i < 8; i++) {
            let name_path = `/sys/class/hwmon/hwmon${i}/name`;
            if (Gio.File.new_for_path(name_path).query_exists(null)) {
                let [ok, name] = GLib.file_get_contents(name_path);
                if (ok) {
                    let drv = name.toString().trim();
                    if (['coretemp', 'k10temp', 'zenpower', 'cpu_thermal'].includes(drv)) {
                        return `/sys/class/hwmon/hwmon${i}/temp1_input`;
                    }
                }
            }
        }
        return '/sys/class/thermal/thermal_zone0/temp';
    }

    _get_cpu_usage() {
        let cpu = new GTop.glibtop_cpu();
        GTop.glibtop_get_cpu(cpu);

        let total = cpu.total;
        let idle = cpu.idle;

        let diff_total = total - this.last_cpu_total;
        let diff_idle = idle - this.last_cpu_idle;

        this.last_cpu_total = total;
        this.last_cpu_idle = idle;

        if (diff_total === 0) return 0;
        return Math.max(0, Math.min(100, Math.round(((diff_total - diff_idle) / diff_total) * 100)));
    }

    _get_ram_usage() {
        let mem = new GTop.glibtop_mem();
        GTop.glibtop_get_mem(mem);

        if (mem.total === 0) return 0;
        return Math.round((mem.user / mem.total) * 100);
    }

    _get_temperature() {
        if (!this.temp_path) return "N/A";
        try {
            let [ok, content] = GLib.file_get_contents(this.temp_path);
            if (ok) {
                let val = parseInt(content.toString().trim());
                return Math.round(val / 1000) + "°";
            }
        } catch (e) {
            this.temp_path = this._get_cpu_sensor_path();
        }
        return "N/A";
    }

    _update() {
        let cpu = this._get_cpu_usage();
        let ram = this._get_ram_usage();
        let temp = this._get_temperature();

        this.set_applet_label(`CPU ${cpu}%  RAM ${ram}%  TEMP ${temp}`);

        Mainloop.timeout_add_seconds(2, () => this._update());
    }
}

function main(metadata, orientation, panel_height, instance_id) {
    return new SimpleMonitorApplet(metadata, orientation, panel_height, instance_id);
}
