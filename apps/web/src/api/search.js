import { request, toQuery } from './request'

export const searchAll = (keyword) => request(`/search${toQuery({ keyword })}`)
