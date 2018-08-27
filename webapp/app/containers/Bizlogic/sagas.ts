/*
 * <<
 * Davinci
 * ==
 * Copyright (C) 2016 - 2017 EDP
 * ==
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * >>
 */

import { takeLatest, takeEvery } from 'redux-saga'
import { call, put } from 'redux-saga/effects'
import {
  LOAD_BIZLOGICS,
  ADD_BIZLOGIC,
  DELETE_BIZLOGIC,
  EDIT_BIZLOGIC,
  LOAD_CASCADESOURCE_FROM_ITEM,
  LOAD_CASCADESOURCE_FROM_DASHBOARD,
  LOAD_BIZDATA_SCHEMA,
  LOAD_SCHEMA,
  EXECUTE_SQL,
  LOAD_DATA,
  LOAD_DISTINCT_VALUE,
  LOAD_DATA_FROM_ITEM,
  LOAD_VIEW_TEAM
} from './constants'
import {
  bizlogicsLoaded,
  loadBizlogicsFail,
  bizlogicAdded,
  addBizlogicFail,
  bizlogicDeleted,
  deleteBizlogicFail,
  bizlogicEdited,
  editBizlogicFail,
  cascadeSourceFromItemLoaded,
  loadCascadeSourceFromItemFail,
  cascadeSourceFromDashboardLoaded,
  loadCascadeSourceFromDashboardFail,
  bizdataSchemaLoaded,
  loadBizdataSchemaFail,
  schemaLoaded,
  loadSchemaFail,
  sqlExecuted,
  executeSqlFail,
  dataLoaded,
  loadDataFail,
  distinctValueLoaded,
  loadDistinctValueFail,
  dataFromItemLoaded,
  loadDataFromItemFail,
  viewTeamLoaded,
  loadViewTeamFail
} from './actions'

const message = require('antd/lib/message')
import request from '../../utils/request'
import api from '../../utils/api'
import { readListAdapter } from '../../utils/asyncAdapter'
import resultsetConverter from '../../utils/resultsetConverter'

declare interface IObjectConstructor {
  assign (...objects: object[]): object
}

export function* getBizlogics (action) {
  const { payload } = action
  try {
    const asyncData = yield call(request, `${api.bizlogic}?projectId=${payload.projectId}`)
    const bizlogics = readListAdapter(asyncData)
    yield put(bizlogicsLoaded(bizlogics))
    if (payload.resolve) {
      payload.resolve(bizlogics)
    }
  } catch (err) {
    yield put(loadBizlogicsFail())
    message.error('加载 View 列表失败')
  }
}

export function* addBizlogic (action) {
  const { payload } = action
  try {
    const asyncData = yield call(request, {
      method: 'post',
      url: api.bizlogic,
      data: payload.bizlogic
    })
    yield put(bizlogicAdded(asyncData.payload))
    payload.resolve()
  } catch (err) {
    yield put(addBizlogicFail())
    message.error('新增失败')
  }
}

export function* deleteBizlogic (action) {
  const { payload } = action
  try {
    const result = yield call(request, {
      method: 'delete',
      url: `${api.bizlogic}/${payload.id}`
    })
    const { code } = result.header
    if (code === 200) {
      yield put(bizlogicDeleted(payload.id))
    } else if (code === 400) {
      message.error(result.header.msg, 3)
      yield put(deleteBizlogicFail())
    }
  } catch (err) {
    yield put(deleteBizlogicFail())
    message.error('删除失败')
  }
}

export function* editBizlogic (action) {
  const { payload } = action
  const { config, description, id, model, name, source, sql } = payload.bizlogic
  try {
    yield call(request, {
      method: 'put',
      url: `${api.bizlogic}/${id}`,
      data: {
        config,
        description,
        id,
        model,
        name,
        sourceId: source.id,
        sql
      }
    })
    yield put(bizlogicEdited(payload.bizlogic))
    payload.resolve()
  } catch (err) {
    yield put(editBizlogicFail())
    message.error('修改失败')
  }
}

export function* getCascadeSourceFromItem (action) {
  const  { payload } = action
  try {
    const { itemId, controlId, id, sql, column, parents } = payload
    const { adHoc, filters, linkageFilters, globalFilters, params, linkageParams, globalParams } = sql
    const data = (Object as IObjectConstructor).assign({
      adHoc,
      manualFilters: [filters, linkageFilters, globalFilters]
        .filter((f) => !!f)
        .join(' and '),
      params: [].concat(params).concat(linkageParams).concat(globalParams),
      childFieldName: column
    }, parents && { parents })

    const asyncData = yield call(request, {
      method: 'post',
      url: `${api.bizlogic}/${id}/distinct_value`,
      data
    })
    const values = resultsetConverter(readListAdapter(asyncData)).dataSource
    yield put(cascadeSourceFromItemLoaded(itemId, controlId, column, values))
  } catch (err) {
    yield put(loadCascadeSourceFromItemFail(err))
  }
}

export function* getCascadeSourceFromDashboard (action) {
  const { payload } = action
  try {
    const { controlId, id, column, parents } = payload

    const data = (Object as IObjectConstructor).assign({
      adHoc: '',
      manualFilters: '',
      params: [],
      childFieldName: column
    }, parents && { parents })

    const asyncData = yield call(request, {
      method: 'post',
      url: `${api.bizlogic}/${id}/distinct_value`,
      data
    })
    const values = resultsetConverter(readListAdapter(asyncData)).dataSource
    yield put(cascadeSourceFromDashboardLoaded(controlId, column, values))
  } catch (err) {
    yield put(loadCascadeSourceFromDashboardFail(err))
  }
}

export function* getBizdataSchema (action) {
  const { payload } = action
  try {
    const { id, resolve } = payload

    const asyncData = yield call(request, {
      method: 'post',
      url: `${api.bizlogic}/${id}/resultset?limit=1`,
      data: {}
    })
    const bizdatas = resultsetConverter(readListAdapter(asyncData))
    yield put(bizdataSchemaLoaded(bizdatas.keys))
    resolve(bizdatas.keys)
  } catch (err) {
    yield put(loadBizdataSchemaFail(err))
  }
}

export function* getSchema (action) {
  const { payload } = action
  try {
    const asyncData = yield call(request, `${api.bizlogic}/database?sourceId=${payload.sourceId}`)
    const schema = readListAdapter(asyncData)
    yield put(schemaLoaded(schema))
    payload.resolve(schema)
  } catch (err) {
    yield put(loadSchemaFail())
    message.error('加载 Schema 列表失败')
  }
}

export function* executeSql (action) {
  const { payload } = action
  try {
    const asyncData = yield call(request, {
      method: 'post',
      url: `${api.bizlogic}/executesql`,
      data: {
        sql: payload.sql,
        sourceId: payload.sourceId
      }
    })
    const result = asyncData && asyncData.header
    yield put(sqlExecuted(result))
    payload.resolve(asyncData.payload)
  } catch (err) {
    yield put(executeSqlFail())
    message.error('执行 SQL 失败')
  }
}

export function* getData (action) {
  const { payload } = action
  try {
    const { id, params, resolve } = payload

    const data = yield call(request, {
      method: 'post',
      url: `${api.bizlogic}/${id}/getdata`,
      data: params
    })
    yield put(dataLoaded())
    resolve(data.payload)
  } catch (err) {
    yield put(loadDataFail(err))
  }
}

export function* getDistinctValue (action) {
  const { payload } = action
  try {
    const { viewId, fieldName, filters, resolve } = payload
    const asyncData = yield call(request, {
      method: 'post',
      url: `${api.bizlogic}/${viewId}/getdistinctvalue`,
      data: {
        column: fieldName,
        parents: Object.entries(filters).map(([column, value]) => ({ column, value }))
      }
    })
    resolve(readListAdapter(asyncData))
    yield put(distinctValueLoaded())
  } catch (err) {
    yield put(loadDistinctValueFail(err))
  }
}

export function* getDataFromItem (action) {
  const { payload } = action
  try {
    const { itemId, viewId, groups, aggregators, sql, cache, expired } = payload

    const data = yield call(request, {
      method: 'post',
      url: `${api.bizlogic}/${viewId}/getdata`,
      data: {
        groups,
        aggregators,
        filters: [],
        params: [],
        orders: [],
        cache,
        expired
      }
    })
    yield put(dataFromItemLoaded(itemId, data.payload))
  } catch (err) {
    yield put(loadDataFromItemFail(err))
  }
}

export function* getViewTeams (action) {
  const { payload } = action
  try {
    const project = yield call(request, `${api.projects}/${payload.projectId}`)
    const currentProject = readListAdapter(project)
    const organization = yield call(request, `${api.organizations}/${currentProject.orgId}/teams`)
    const orgTeam = readListAdapter(organization)
    yield put(viewTeamLoaded(orgTeam))
  } catch (err) {
    yield put(loadViewTeamFail(err))
  }
}

export default function* rootBizlogicSaga (): IterableIterator<any> {
  yield [
    takeLatest(LOAD_BIZLOGICS, getBizlogics),
    takeEvery(ADD_BIZLOGIC, addBizlogic),
    takeEvery(DELETE_BIZLOGIC, deleteBizlogic),
    takeEvery(EDIT_BIZLOGIC, editBizlogic),
    takeEvery(LOAD_CASCADESOURCE_FROM_ITEM, getCascadeSourceFromItem),
    takeEvery(LOAD_CASCADESOURCE_FROM_DASHBOARD, getCascadeSourceFromDashboard),
    takeEvery(LOAD_BIZDATA_SCHEMA, getBizdataSchema),
    takeLatest(LOAD_SCHEMA, getSchema),
    takeLatest(EXECUTE_SQL, executeSql),
    takeEvery(LOAD_DATA, getData),
    takeEvery(LOAD_DISTINCT_VALUE, getDistinctValue),
    takeEvery(LOAD_DATA_FROM_ITEM, getDataFromItem),
    takeLatest(LOAD_VIEW_TEAM, getViewTeams)
  ]
}
