const cookies = document.cookie.split(';').reduce((cookies, cookie) => {
  const [key, value] = cookie.split('=')
  cookies[key] = value

  return cookies
}, {})

export default new Proxy(cookies, {
  get(target, name) {
    return target[name]
  },

  set(target, name, value) {
    target[name] = value
    document.cookie = `${name}=${value}`
    return value
  }
})
