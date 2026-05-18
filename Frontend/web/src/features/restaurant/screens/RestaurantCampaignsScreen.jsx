import { useCallback, useEffect, useState } from 'react'
import {
  createChainCoupon,
  createChainPromotion,
  deleteChainCoupon,
  deleteChainPromotion,
  fetchChainCoupons,
  fetchChainPromotions,
} from '../../../services/restaurantOpsService'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'

const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT']
const DISCOUNT_TARGETS = ['ORDER', 'PRODUCT', 'DELIVERY', 'CATEGORY']

function emptyPromotionDraft() {
  return {
    name: '',
    description: '',
    type: 'PERCENTAGE',
    target: 'ORDER',
    start_date: '',
    end_date: '',
    discount: '10',
  }
}

function emptyCouponDraft() {
  return {
    code: '',
    description: '',
    type: 'PERCENTAGE',
    target: 'ORDER',
    discount: '10',
    min_order_total: '',
    max_discount_amount: '',
    max_uses: '',
    expiry_date: '',
  }
}

export function RestaurantCampaignsScreen({ session }) {
  const [promotions, setPromotions] = useState([])
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [infoText, setInfoText] = useState('')
  const [promotionDraft, setPromotionDraft] = useState(emptyPromotionDraft())
  const [couponDraft, setCouponDraft] = useState(emptyCouponDraft())
  const [showPromotionForm, setShowPromotionForm] = useState(false)
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [deletePromotionTarget, setDeletePromotionTarget] = useState(null)
  const [deleteCouponTarget, setDeleteCouponTarget] = useState(null)

  const load = useCallback(async () => {
    if (!session?.chainId) {
      setErrorText('Sem chain_id na sessao. Esta vista exige permissoes de cadeia.')
      return
    }
    try {
      setLoading(true)
      const [promotionsList, couponsList] = await Promise.all([
        fetchChainPromotions({ session }),
        fetchChainCoupons({ session }),
      ])
      setPromotions(promotionsList)
      setCoupons(couponsList)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    queueMicrotask(() => load())
  }, [load])

  async function handleCreatePromotion() {
    if (!promotionDraft.name.trim()) {
      setErrorText('Nome obrigatorio.')
      return
    }
    try {
      setSaving(true)
      const items =
        promotionDraft.target === 'ORDER' || promotionDraft.target === 'DELIVERY'
          ? [{ discount: Number(promotionDraft.discount ?? 0) }]
          : []
      await createChainPromotion({
        session,
        input: {
          name: promotionDraft.name,
          description: promotionDraft.description || null,
          type: promotionDraft.type,
          target: promotionDraft.target,
          start_date: promotionDraft.start_date || null,
          end_date: promotionDraft.end_date || null,
          items,
        },
      })
      setInfoText('Promocao criada.')
      setPromotionDraft(emptyPromotionDraft())
      setShowPromotionForm(false)
      await load()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDeletePromotion() {
    if (!deletePromotionTarget) return
    try {
      setSaving(true)
      await deleteChainPromotion({ session, promotionId: deletePromotionTarget.id })
      setInfoText('Promocao apagada.')
      setDeletePromotionTarget(null)
      await load()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateCoupon() {
    if (!couponDraft.code.trim()) {
      setErrorText('Codigo de cupao obrigatorio.')
      return
    }
    try {
      setSaving(true)
      await createChainCoupon({
        session,
        input: {
          code: couponDraft.code.trim().toUpperCase(),
          description: couponDraft.description || null,
          type: couponDraft.type,
          target: couponDraft.target,
          discount: couponDraft.discount,
          min_order_total: couponDraft.min_order_total,
          max_discount_amount: couponDraft.max_discount_amount,
          max_uses: couponDraft.max_uses,
          expiry_date: couponDraft.expiry_date || null,
        },
      })
      setInfoText('Cupao criado.')
      setCouponDraft(emptyCouponDraft())
      setShowCouponForm(false)
      await load()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDeleteCoupon() {
    if (!deleteCouponTarget) return
    try {
      setSaving(true)
      await deleteChainCoupon({ session, couponId: deleteCouponTarget.id })
      setInfoText('Cupao apagado.')
      setDeleteCouponTarget(null)
      await load()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Campanhas</h2>
          <p>Promocoes e cupoes da cadeia</p>
        </div>
        <button type="button" className="rb-btn-outline" onClick={load} disabled={loading}>
          {loading ? 'A carregar...' : 'Atualizar'}
        </button>
      </header>

      <article className="rb-table-card">
        <div className="rb-table-head">
          <h3>Promocoes</h3>
          <button
            type="button"
            className="rb-primary"
            onClick={() => setShowPromotionForm((state) => !state)}
          >
            {showPromotionForm ? 'Fechar' : '+ Nova promocao'}
          </button>
        </div>

        {showPromotionForm ? (
          <div className="rb-login-form">
            <label>
              Nome
              <input
                value={promotionDraft.name}
                onChange={(event) =>
                  setPromotionDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              Descricao
              <input
                value={promotionDraft.description}
                onChange={(event) =>
                  setPromotionDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Tipo
              <select
                value={promotionDraft.type}
                onChange={(event) =>
                  setPromotionDraft((current) => ({ ...current, type: event.target.value }))
                }
              >
                {DISCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alvo
              <select
                value={promotionDraft.target}
                onChange={(event) =>
                  setPromotionDraft((current) => ({ ...current, target: event.target.value }))
                }
              >
                {DISCOUNT_TARGETS.map((target) => (
                  <option key={target} value={target}>
                    {target}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Valor desconto (% ou EUR)
              <input
                type="number"
                step="0.01"
                value={promotionDraft.discount}
                onChange={(event) =>
                  setPromotionDraft((current) => ({ ...current, discount: event.target.value }))
                }
              />
            </label>
            <label>
              Inicio (ISO)
              <input
                type="date"
                value={promotionDraft.start_date}
                onChange={(event) =>
                  setPromotionDraft((current) => ({ ...current, start_date: event.target.value }))
                }
              />
            </label>
            <label>
              Fim (ISO)
              <input
                type="date"
                value={promotionDraft.end_date}
                onChange={(event) =>
                  setPromotionDraft((current) => ({ ...current, end_date: event.target.value }))
                }
              />
            </label>
            <button
              type="button"
              className="rb-btn-accept"
              onClick={handleCreatePromotion}
              disabled={saving}
            >
              Criar promocao
            </button>
          </div>
        ) : null}

        {promotions.length === 0 && !loading ? (
          <p>Sem promocoes.</p>
        ) : null}

        {promotions.map((promotion) => (
          <div className="rb-detail-row" key={promotion.id}>
            <span>
              <strong>{promotion.name}</strong>
              <br />
              <small>
                {promotion.type} - {promotion.target}
                {promotion.start_date ? ` - de ${promotion.start_date}` : ''}
                {promotion.end_date ? ` ate ${promotion.end_date}` : ''}
              </small>
            </span>
            <button
              type="button"
              className="rb-icon-mini danger"
              onClick={() => setDeletePromotionTarget(promotion)}
            >
              Apagar
            </button>
          </div>
        ))}
      </article>

      <article className="rb-table-card">
        <div className="rb-table-head">
          <h3>Cupoes</h3>
          <button
            type="button"
            className="rb-primary"
            onClick={() => setShowCouponForm((state) => !state)}
          >
            {showCouponForm ? 'Fechar' : '+ Novo cupao'}
          </button>
        </div>

        {showCouponForm ? (
          <div className="rb-login-form">
            <label>
              Codigo
              <input
                value={couponDraft.code}
                onChange={(event) =>
                  setCouponDraft((current) => ({ ...current, code: event.target.value }))
                }
                placeholder="Ex: LUNCH10"
              />
            </label>
            <label>
              Descricao
              <input
                value={couponDraft.description}
                onChange={(event) =>
                  setCouponDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <label>
              Tipo
              <select
                value={couponDraft.type}
                onChange={(event) =>
                  setCouponDraft((current) => ({ ...current, type: event.target.value }))
                }
              >
                {DISCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Alvo
              <select
                value={couponDraft.target}
                onChange={(event) =>
                  setCouponDraft((current) => ({ ...current, target: event.target.value }))
                }
              >
                {DISCOUNT_TARGETS.map((target) => (
                  <option key={target} value={target}>
                    {target}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Valor desconto (% ou EUR)
              <input
                type="number"
                step="0.01"
                value={couponDraft.discount}
                onChange={(event) =>
                  setCouponDraft((current) => ({ ...current, discount: event.target.value }))
                }
              />
            </label>
            <label>
              Total minimo (opcional)
              <input
                type="number"
                step="0.01"
                value={couponDraft.min_order_total}
                onChange={(event) =>
                  setCouponDraft((current) => ({
                    ...current,
                    min_order_total: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Desconto maximo (opcional)
              <input
                type="number"
                step="0.01"
                value={couponDraft.max_discount_amount}
                onChange={(event) =>
                  setCouponDraft((current) => ({
                    ...current,
                    max_discount_amount: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Numero maximo de usos (opcional)
              <input
                type="number"
                value={couponDraft.max_uses}
                onChange={(event) =>
                  setCouponDraft((current) => ({ ...current, max_uses: event.target.value }))
                }
              />
            </label>
            <label>
              Validade (ISO)
              <input
                type="date"
                value={couponDraft.expiry_date}
                onChange={(event) =>
                  setCouponDraft((current) => ({ ...current, expiry_date: event.target.value }))
                }
              />
            </label>
            <button
              type="button"
              className="rb-btn-accept"
              onClick={handleCreateCoupon}
              disabled={saving}
            >
              Criar cupao
            </button>
          </div>
        ) : null}

        {coupons.length === 0 && !loading ? <p>Sem cupoes.</p> : null}

        {coupons.map((coupon) => (
          <div className="rb-detail-row" key={coupon.id}>
            <span>
              <strong>{coupon.code}</strong>
              <br />
              <small>
                {coupon.type} - {coupon.target}
                {coupon.expiry_date ? ` ate ${coupon.expiry_date}` : ''}
              </small>
            </span>
            <button
              type="button"
              className="rb-icon-mini danger"
              onClick={() => setDeleteCouponTarget(coupon)}
            >
              Apagar
            </button>
          </div>
        ))}
      </article>

      {infoText ? <p className="rb-success-note">{infoText}</p> : null}
      {errorText ? <p className="rb-chat-error">{errorText}</p> : null}

      <ConfirmDialog
        open={Boolean(deletePromotionTarget)}
        title="Apagar promocao"
        description={`Apagar "${deletePromotionTarget?.name ?? ''}". Os clientes deixam de a ver.`}
        confirmLabel="Apagar"
        destructive
        loading={saving}
        onCancel={() => {
          if (!saving) setDeletePromotionTarget(null)
        }}
        onConfirm={handleConfirmDeletePromotion}
      />

      <ConfirmDialog
        open={Boolean(deleteCouponTarget)}
        title="Apagar cupao"
        description={`Apagar cupao "${deleteCouponTarget?.code ?? ''}".`}
        confirmLabel="Apagar"
        destructive
        loading={saving}
        onCancel={() => {
          if (!saving) setDeleteCouponTarget(null)
        }}
        onConfirm={handleConfirmDeleteCoupon}
      />
    </section>
  )
}
