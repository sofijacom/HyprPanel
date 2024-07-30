export type WorkspaceRule = {
    workspaceString: string,
    monitor: string,
}

export type WorkspaceMap = {
    [key: string]: number[],
}

export type HyprWorkspace = {
    id: number,
    name: string,
    monitor: string,
    monitorID: number,
    windows: number,
    hasfullscreen: boolean,
    lastwindow: string,
    lastwindowtitle: string,
}
