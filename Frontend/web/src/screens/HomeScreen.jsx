import { useState } from 'react'
import { PrimaryButton } from '../components/common/PrimaryButton'
import { PageContainer } from '../components/layout/PageContainer'
import { getApiHealth } from '../services/healthService'

export function HomeScreen() {
  const [status, setStatus] = useState('Sem verificacao ainda.')

  async function handleCheckHealth() {
    try {
      const result = await getApiHealth()
      setStatus(`API online: ${JSON.stringify(result)}`)
    } catch (error) {
      setStatus('Falha ao contactar a API. Ajusta VITE_API_BASE_URL e endpoint.')
    }
  }

  return (
    <PageContainer
      title="Frontend Web"
      subtitle="Estrutura base pronta com components, screens e services."
    >
      <p className="body-text">
        Comeca por editar os ecras em <code>src/screens</code> e componentes em
        <code> src/components</code>.
      </p>
      <PrimaryButton onClick={handleCheckHealth}>Testar ligacao API</PrimaryButton>
      <p className="status-text">{status}</p>
    </PageContainer>
  )
}
