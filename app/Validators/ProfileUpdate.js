'use strict'

const { ResponseParser } = use('App/Helpers')


class ProfileUpdate {
  get rules () {
    const id = this.ctx.params.id
    return {
      name: 'required|max:50',
      email: `unique:users,email,id,${id}`,
      phone: `required|max:30|unique:users,phone,id,${id}`,
    }
  }

  get messages() {
    return {
      required: '{{ field }} is required',
      email: '{{ field }} is not a valid email',
      unique: '{{ field }} is already registered'
    }
  }

  get sanitizationRules () {
    return {
      email: 'normalize_email',
      name: 'escape',
      phone: 'escape',
    }
  }

  async fails (errorMessages) {
    return this.ctx.response.status(422).send(ResponseParser.apiValidationFailed(errorMessages))
  }
}

module.exports = ProfileUpdate
