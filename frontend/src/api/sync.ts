import api, { type ApiResponse } from "@/api"

export interface SyncConfig {
    db_type: string
    host: string
    port: number
    user: string
    password?: string
    db_name: string
    ssl_mode?: string
}

export interface TableCompareResult {
    table_name: string
    local_count: number
    remote_count: number
}

export interface SyncResult {
    table_name: string
    synced_count: number
    success: boolean
    error_message: string
}

export const syncApi = {
    // 获取同步配置
    getConfig() {
        return api.get('/sync/config')
    },

    // 测试连接
    testConnection(config: SyncConfig) {
        return api.post<ApiResponse<null>>("/sync/test-connection", config)
    },

    // 对比数据
    compare(config: SyncConfig) {
        return api.post<ApiResponse<TableCompareResult[]>>("/sync/compare", config)
    },

    // 执行同步
    execute(config: SyncConfig, tables: string[]) {
        return api.post<ApiResponse<SyncResult[]>>("/sync/execute", {
            ...config,
            tables
        })
    }
}
