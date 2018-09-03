'use strict'

const User = use('App/Models/User')
const Role = use('App/Models/Role')
const { RedisHelper, ResponseParser } = use('App/Helpers')
const { ActivityTraits, ActivationTraits } = use('App/Traits')
const fillable = ['name', 'email', 'password', 'phone', 'is_active']

class UserController {
  /**
   * Index
   * Get List of Users
   */
  async index({ request, response }) {
    let { page, limit, search } = request.get()
    if (!page) page = 1
    if (!limit) limit = 10

    // Query with search
    if (search && search != '') {
      const data = await User.query()
        .with('roles', builder => {
          builder.select('id', 'slug')
        })
        .where('name', 'like', `%${search}%`)
        .orWhere('email', 'like', `%${search}%`)
        .orWhere('phone', 'like', `%${search}%`)
        .paginate(parseInt(page), parseInt(limit))
      let parsed = ResponseParser.apiCollection(data.toJSON())
      return response.status(200).send(parsed)

      // Query with role id
    } else {
      let redisKey = `User_${page}_${limit}`
      let cached = await RedisHelper.get(redisKey)
      if (cached != null) {
        return cached
      }
      const data = await User.query()
        .with('roles', builder => {
          builder.select('id', 'slug')
        })
        .orderBy('name')
        .paginate(parseInt(page), parseInt(limit))
      let parsed = ResponseParser.apiCollection(data.toJSON())
      await RedisHelper.set(redisKey, parsed)
      return response.status(200).send(parsed)
    }
  }

  /**
   * Store
   * Create New User
   */

  async store({ request, response, auth }) {
    let body = request.only(fillable)
    const data = await User.create(body)
    let { roles } = request.post()
    if (roles) {
      await this.attachRoles(data, roles)
    }
    await data.load('roles')
    await ActivationTraits.createAndActivate(data)
    await RedisHelper.delete('User_*')
    const activity = `Add new User '${data.name}'`
    await ActivityTraits.saveActivity(request, auth, activity)
    await RedisHelper.delete('User_*')
    let parsed = ResponseParser.apiCreated(data.toJSON())
    return response.status(201).send(parsed)
  }

  /**
   * Show
   * Get User by ID
   */

  async show({ request, response }) {
    const id = request.params.id
    let redisKey = `User_${id}`
    let cached = await RedisHelper.get(redisKey)
    if (cached) {
      return response.status(200).send(cached)
    }

    const data = await User.query()
      .with('roles')
      .where('id', id)
      .first()
    if (!data) {
      return response.status(400).send(ResponseParser.apiNotFound())
    }
    if (data.role_id === 3) {
      await data.load('marketings')
    }
    if (data.role_id === 4) {
      await data.load('supervisors')
    }
    let parsed = ResponseParser.apiItem(data.toJSON())
    await RedisHelper.set(redisKey, parsed)
    return response.status(200).send(parsed)
  }

  /**
   * Update
   * Update User data by ID
   */

  async update({ request, response, auth }) {
    const id = request.params.id
    const data = await User.find(id)
    if (!data) {
      return response.status(400).send(ResponseParser.apiNotFound())
    }
    let body = request.only(fillable)
    await data.merge(body)
    await data.save()
    let { roles } = request.post()
    if (roles) {
      await this.attachRoles(data, roles)
    }
    await data.load('roles')
    const activity = `Update User '${data.name}'`
    await ActivityTraits.saveActivity(request, auth, activity)
    await RedisHelper.delete('User_*')
    let parsed = ResponseParser.apiUpdated(data.toJSON())
    return response.status(200).send(parsed)
  }

  /**
   * Delete
   * Delete User data by ID
   */

  async destroy({ request, response, auth }) {
    const id = request.params.id
    const data = await User.find(id)
    if (!data) {
      return response.status(400).send(ResponseParser.apiNotFound())
    }

    const activity = `Delete User '${data.name}'`
    await ActivityTraits.saveActivity(request, auth, activity)
    await RedisHelper.delete('User_*')
    // Delete Relationship
    await data.tokens().delete()
    await data.roles().detach()
    // Delete Data
    await data.delete()
    return response.status(200).send(ResponseParser.apiDeleted())
  }

  /**
   * Attach Roles to User
   */

  async attachRoles(user, roles) {
    await user.roles().detach()
    roles.forEach(async r => {
      let role = await Role.find(r)
      if (role) {
        await user.roles().attach(role.id)
      }
    })
  }
}

module.exports = UserController
