const hyprland = await Service.import("hyprland");
import options from "options";
import { getCurrentMonitorWorkspaces, getWorkspaceRules, getWorkspacesForMonitor, createThrottledScrollHandlers, getOccupiedWorkspaces } from "./helpers";

const { workspaces, show_occupied, monitorSpecific, scroll_speed, spacing } = options.bar.workspaces;

function range(length: number, start = 1) {
    return Array.from({ length }, (_, i) => i + start);
}

hyprland.connect("changed", () => {
    // console.log(JSON.stringify(hyprland.monitors, null, 2));

})
const Workspaces = (monitor = -1, ws = 8) => {

    const currentMonitorWorkspaces = Variable(getCurrentMonitorWorkspaces(monitor));

    const filterWorkspaces = (index: number, monitorSpecific: boolean, occupiedWSs: boolean) => {
        const currentOccupied = getOccupiedWorkspaces(monitor, monitorSpecific);
        log(`monitor: ${monitor} => ${currentOccupied}`)
        if (!monitorSpecific) {
            if (occupiedWSs) {
                return currentOccupied.includes(index);
            }
            return true;
        }
        const workspaceRules = getWorkspaceRules();
        if (occupiedWSs) {

            return currentOccupied.includes(index) && getWorkspacesForMonitor(index, workspaceRules, monitor);
        }
        return getWorkspacesForMonitor(index, workspaceRules, monitor);
    }
    return {
        component: Widget.Box({
            class_name: "workspaces",
            children: Utils.merge(
                [workspaces.bind(), monitorSpecific.bind(), show_occupied.bind()],
                (wrkSpcs, monitorSpecific, occupiedWSs) => {
                    return range(wrkSpcs || 8)
                        .filter((i) => {
                            return filterWorkspaces(i, monitorSpecific, occupiedWSs);
                        })
                        .map((i) => {
                            return Widget.Button({
                                class_name: "workspace-button",
                                on_primary_click: () => {
                                    hyprland.messageAsync(`dispatch workspace ${i}`)

                                },
                                child: Widget.Label({
                                    attribute: i,
                                    vpack: "center",
                                    css: spacing.bind("value").as(sp => `margin: 0rem ${0.375 * sp}rem;`),
                                    class_name: Utils.merge(
                                        [
                                            options.bar.workspaces.show_icons.bind("value"),
                                            options.bar.workspaces.show_numbered.bind("value"),
                                            options.bar.workspaces.numbered_active_indicator.bind("value"),
                                            options.bar.workspaces.icons.available.bind("value"),
                                            options.bar.workspaces.icons.active.bind("value"),
                                            options.bar.workspaces.icons.occupied.bind("value"),
                                            hyprland.active.workspace.bind("id")
                                        ],
                                        (show_icons, show_numbered, numbered_active_indicator) => {
                                            if (show_icons) {
                                                return `workspace-icon`;
                                            }
                                            if (show_numbered) {
                                                const numActiveInd = hyprland.active.workspace.id === i
                                                    ? numbered_active_indicator
                                                    : "";

                                                return `workspace-number ${numActiveInd}`;
                                            }
                                            return "";
                                        },
                                    ),
                                    label: Utils.merge(
                                        [
                                            options.bar.workspaces.show_icons.bind("value"),
                                            options.bar.workspaces.icons.available.bind("value"),
                                            options.bar.workspaces.icons.active.bind("value"),
                                            options.bar.workspaces.icons.occupied.bind("value"),
                                            hyprland.active.workspace.bind("id")
                                        ],
                                        (showIcons, available, active, occupied, _) => {
                                            if (showIcons) {
                                                if (hyprland.active.workspace.id === i) {
                                                    return active;
                                                }
                                                if ((hyprland.getWorkspace(i)?.windows || 0) > 0) {
                                                    return occupied;
                                                }
                                                if (
                                                    monitor !== -1
                                                ) {
                                                    return available;
                                                }
                                            }
                                            return `${i}`;
                                        },
                                    ),
                                    setup: (self) => {
                                        self.hook(hyprland, () => {
                                            self.toggleClassName(
                                                "active",
                                                hyprland.active.workspace.id === i,
                                            );
                                            self.toggleClassName(
                                                "occupied",
                                                (hyprland.getWorkspace(i)?.windows || 0) > 0,
                                            );
                                        });
                                    },
                                })
                            });
                        });
                },
            ),
            setup: (box) => {
                if (ws === 0) {
                    box.hook(hyprland.active.workspace, () =>
                        box.children.map((btn) => {
                            btn.visible = hyprland.workspaces.some(
                                (ws) => ws.id === btn.attribute,
                            );
                        }),
                    );
                }
            },
        }),
        isVisible: true,
        boxClass: "workspaces",
        props: {
            setup: (self: any) => {
                self.hook(scroll_speed, () => {
                    const { throttledScrollUp, throttledScrollDown } = createThrottledScrollHandlers(scroll_speed.value, currentMonitorWorkspaces);
                    self.on_scroll_up = throttledScrollUp;
                    self.on_scroll_down = throttledScrollDown;
                });
            }
        }
    };
};
export { Workspaces };
