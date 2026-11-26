import request from '../utils/request'
import type { SysDict } from '../types'

/** 全部字典(含字典项),供业务表单下拉使用 */
export const listAllDicts = () => request.get<unknown, SysDict[]>('/system/dicts/all')
