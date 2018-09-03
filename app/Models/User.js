'use strict'

const Model = use('Model')
const Env = use('Env')
class User extends Model {
  static boot() {
    super.boot()
    this.addHook('beforeCreate', ['User.hashPassword', 'User.generateUid'])

  }

  static get hidden() {
    return ['password', 'verification_token']
  }

  static get traits () {
    return [
      '@provider:Adonis/Acl/HasRole',
      '@provider:Adonis/Acl/HasPermission'
    ]
  }

  tokens() {
    return this.hasMany('App/Models/Token')
  }

  getPhoto() {
    if (this.photo) {
      return `${Env.get('APP_URL')}/${this.photo}`
    } else return ''
  }
}

module.exports = User
