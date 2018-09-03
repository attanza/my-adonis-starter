'use strict'

const User = use('App/Models/User')
const { ResponseParser, RedisHelper } = use('App/Helpers')

class UserQueryTraits {

  constructor(page, limit, search, role_id) {
    this.search = search || ''
    this.page = page || 1
    this.limit = limit || 10
    this.role_id = role_id || 0
  }

  async qBySearch() {
    const data = await User.query()
      .with('role')
      .where('name', 'like', `%${this.search}%`)
      .orWhere('email', 'like', `%${this.search}%`)
      .orWhere('phone', 'like', `%${this.search}%`)
      .paginate(parseInt(this.page), parseInt(this.limit))
    let parsed = ResponseParser.apiCollection(data.toJSON())
    return parsed
  }

  async qByRole() {
    let redisKey = `User_${this.page}_${this.limit}_${this.role_id}`
    let cached = await RedisHelper.get(redisKey)
    if (cached != null) {
      return cached
    }
    const data = await User.query()
      .with('roles')
      .with('marketings')
      .with('supervisors')
      .where('role_id', parseInt(this.role_id))
      .orderBy('name')
      .paginate(parseInt(this.page), parseInt(this.limit))
    let parsed = ResponseParser.apiCollection(data.toJSON())
    await RedisHelper.set(redisKey, parsed)
    return parsed
  }

  async qDefault() {
    let redisKey = `User_${this.page}_${this.limit}`
    let cached = await RedisHelper.get(redisKey)
    if (cached != null) {
      return cached
    }
    const data = await User.query()
      .with('role')
      .orderBy('name')
      .paginate(parseInt(this.page), parseInt(this.limit))
    let parsed = ResponseParser.apiCollection(data.toJSON())
    await RedisHelper.set(redisKey, parsed)
    return parsed
  }
}

module.exports = UserQueryTraits
