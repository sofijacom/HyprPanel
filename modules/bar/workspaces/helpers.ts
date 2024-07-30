const hyprland = await Service.import("hyprland");
import { WorkspaceRule, WorkspaceMap, HyprWorkspace } from "lib/types/workspace";
import options from "options";
import { Variable } from "types/variable";

const { workspaces, reverse_scroll } = options.bar.workspaces;

export const getOccupiedWorkspaces = (monitor: number, monitorSpecific: boolean): number[] => {
    const onlyWorkspace = hyprland.monitors?.find(m => m.id === monitor)?.activeWorkspace.id || 0;

    try {
        const hyprWrkspcRes = Utils.exec("hyprctl workspaces -j");
        const hyprWrkspcs: HyprWorkspace[] = JSON.parse(hyprWrkspcRes);
        if (!hyprWrkspcs.length) {
            return [onlyWorkspace];
        }

        const occupiedWorkspaces = hyprWrkspcs.filter(hw => monitorSpecific ? hw.monitorID === monitor : true);

        // if no workspaces are occupied then return the active one
        if (!occupiedWorkspaces.length) {
            return [onlyWorkspace];
        }

        return occupiedWorkspaces.map(ow => ow.id);
    } catch (err) {
        return [onlyWorkspace];
    }
}

export const getWorkspacesForMonitor = (curWs: number, wsRules: WorkspaceMap, monitor: number) => {
    if (!wsRules || !Object.keys(wsRules).length) {
        return true;
    }

    const monitorMap = {};
    hyprland.monitors.forEach((m) => (monitorMap[m.id] = m.name));

    const currentMonitorName = monitorMap[monitor];
    return wsRules[currentMonitorName].includes(curWs);
};

export const getWorkspaceRules = (): WorkspaceMap => {
    try {
        const rules = Utils.exec("hyprctl workspacerules -j");

        const workspaceRules = {};

        JSON.parse(rules).forEach((rule: WorkspaceRule, index: number) => {
            if (Object.hasOwnProperty.call(workspaceRules, rule.monitor)) {
                workspaceRules[rule.monitor].push(index + 1);
            } else {
                workspaceRules[rule.monitor] = [index + 1];
            }
        });

        return workspaceRules;
    } catch (err) {
        console.error(err);
        return {};
    }
};

export const getCurrentMonitorWorkspaces = (monitor: number) => {

    if (hyprland.monitors.length === 1) {
        return Array.from({ length: workspaces.value }, (_, i) => i + 1);
    }

    const monitorWorkspaces = getWorkspaceRules();
    const monitorMap = {};
    hyprland.monitors.forEach((m) => (monitorMap[m.id] = m.name));

    const currentMonitorName = monitorMap[monitor];

    return monitorWorkspaces[currentMonitorName];
}


export const createThrottledScrollHandlers = (scrollSpeed: number, currentMonitorWorkspaces: Variable<any>) => {
    const goToNextWS = (currentMonitorWorkspaces: Variable<any>) => {
        const curWorkspace = hyprland.active.workspace.id;
        const indexOfWs = currentMonitorWorkspaces.value.indexOf(curWorkspace);
        let nextIndex = indexOfWs + 1;
        if (nextIndex >= currentMonitorWorkspaces.value.length) {
            nextIndex = 0;
        }

        hyprland.messageAsync(`dispatch workspace ${currentMonitorWorkspaces.value[nextIndex]}`)
    }

    const goToPrevWS = (currentMonitorWorkspaces: Variable<any>) => {
        const curWorkspace = hyprland.active.workspace.id;
        const indexOfWs = currentMonitorWorkspaces.value.indexOf(curWorkspace);
        let prevIndex = indexOfWs - 1;
        if (prevIndex < 0) {
            prevIndex = currentMonitorWorkspaces.value.length - 1;
        }

        hyprland.messageAsync(`dispatch workspace ${currentMonitorWorkspaces.value[prevIndex]}`)
    }

    const throttle = <T extends (...args: any[]) => void>(func: T, limit: number): T => {
        let inThrottle: boolean;
        return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        } as T;
    };

    const throttledScrollUp = throttle(() => {
        if (reverse_scroll.value === true) {
            goToPrevWS(currentMonitorWorkspaces);
        } else {
            goToNextWS(currentMonitorWorkspaces);
        }
    }, 200 / scrollSpeed);

    const throttledScrollDown = throttle(() => {
        if (reverse_scroll.value === true) {
            goToNextWS(currentMonitorWorkspaces);
        } else {
            goToPrevWS(currentMonitorWorkspaces);
        }
    }, 200 / scrollSpeed);

    return { throttledScrollUp, throttledScrollDown };
}
