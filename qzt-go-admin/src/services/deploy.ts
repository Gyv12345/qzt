import request from '../utils/request'
import type { DeployStatus, DeployTarget } from '../types/deploy'

/** 触发一次静态站重建(异步;进度与日志尾走 getDeployStatus 轮询) */
export const runStaticDeploy = (target: DeployTarget) =>
  request.post<unknown, boolean>('/deploy/static', { target })

/** 查询重建状态(running + 各目标最近一次结果/日志尾) */
export const getDeployStatus = () => request.get<unknown, DeployStatus>('/deploy/status')
