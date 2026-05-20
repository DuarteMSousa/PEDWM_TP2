import { graphqlRequest } from './apiClient'

const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      user_type
    }
  }
`

const LOGIN_USER_MUTATION = `
  mutation AuthenticateByCredentials($email: String!, $password: String!) {
    authenticateByCredentials(email: $email, password: $password) {
      id
      name
      email
      user_type
    }
  }
`

function mapUserTypeToRole(userType) {
  if (userType === 'CUSTOMER') return 'customer'
  if (userType === 'COURIER') return 'courier'
  return null
}

function mapRoleToUserType(role) {
  if (role === 'courier') return 'COURIER'
  return 'CUSTOMER'
}

function buildSession({ user, email, token = '' }) {
  const role = mapUserTypeToRole(user.user_type)
  if (!role) {
    throw new Error('Conta sem perfil mobile (usa CUSTOMER ou COURIER).')
  }

  return {
    userId: user.id,
    devUserId: user.id,
    role,
    userType: user.user_type,
    name: user.name || email.split('@')[0] || 'utilizador',
    email: user.email ?? email,
    token: String(token ?? '').trim(),
  }
}

export async function loginMobileUser({ email, password, token = '' }) {
  const trimmedEmail = String(email ?? '').trim()
  const trimmedPassword = String(password ?? '').trim()

  if (!trimmedEmail || !trimmedPassword) {
    throw new Error('Preenche email e password.')
  }

  const data = await graphqlRequest({
    query: LOGIN_USER_MUTATION,
    variables: {
      email: trimmedEmail,
      password: trimmedPassword,
    },
  })

  const user = data?.authenticateByCredentials

  if (!user?.id) {
    throw new Error('Nao foi possivel autenticar o utilizador.')
  }

  return buildSession({ user, email: trimmedEmail, token })
}

export async function registerMobileUser({ email, password, role = 'customer', token = '' }) {
  const trimmedEmail = String(email ?? '').trim()
  const trimmedPassword = String(password ?? '').trim()
  const userType = mapRoleToUserType(role)

  if (!trimmedEmail || !trimmedPassword) {
    throw new Error('Preenche email e password.')
  }

  const defaultName = trimmedEmail.split('@')[0] || 'utilizador'

  try {
    await graphqlRequest({
      query: CREATE_USER_MUTATION,
      variables: {
        input: {
          name: defaultName,
          email: trimmedEmail,
          password: trimmedPassword,
          user_type: userType,
        },
      },
    })
  } catch (error) {
    const message = String(error?.message ?? '')
    if (
      message.includes('users_email_unique') ||
      message.toLowerCase().includes('unique constraint') ||
      message.toLowerCase().includes('unique') ||
      message.toLowerCase().includes('ja esta registado') ||
      message.toLowerCase().includes('duplicate') ||
      message.toLowerCase().includes('already')
    ) {
      throw new Error('Este email ja esta registado.')
    }

    throw error
  }

  return loginMobileUser({
    email: trimmedEmail,
    password: trimmedPassword,
    token,
  })
}
