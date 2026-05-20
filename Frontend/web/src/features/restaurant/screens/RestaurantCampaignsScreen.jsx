import { useCallback, useEffect, useState } from 'react'
import {
  createChainCoupon,
  createChainPromotion,
  deleteChainCoupon,
  deleteChainPromotion,
  fetchChainCoupons,
  fetchChainProductsAndCategories,
  fetchChainPromotions,
  updateChainCoupon,
  updateChainPromotion,
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
    discount: '',
    item_id: '',
  }
}

function emptyCouponDraft() {
  return {
    code: '',
    description: '',
    type: 'PERCENTAGE',
    target: 'ORDER',
    discount: '',
    item_id: '',
    expiry_date: '',
  }
}

function buildItems(draft) {
  if (draft.target === 'PRODUCT' || draft.target === 'CATEGORY') {
    return draft.item_id ? [{ item_id: draft.item_id }] : []
  }
  return []
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
  const [editingPromotionId, setEditingPromotionId] = useState('')
  const [editingCouponId, setEditingCouponId] = useState('')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])

  const load = useCallback(async () => {
    if (!session?.chainId) {
      setErrorText('Sem chain_id na sessao. Esta vista exige permissoes de cadeia.')
      return
    }
    try {
      setLoading(true)
      const [promotionsList, couponsList, catalog] = await Promise.all([
        fetchChainPromotions({ session }),
        fetchChainCoupons({ session }),
        fetchChainProductsAndCategories({ session }).catch(() => ({ categories: [], products: [] })),
      ])
      setPromotions(promotionsList)
      setCoupons(couponsList)
      setCategories(catalog.categories)
      setProducts(catalog.products)
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

  async function handleSavePromotion() {
    if (!promotionDraft.name.trim()) {
      setErrorText('Nome obrigatorio.')
      return
    }
    if (promotionDraft.target === 'PRODUCT' && !promotionDraft.item_id) {
      setErrorText('Escolhe o produto.')
      return
    }
    if (promotionDraft.target === 'CATEGORY' && !promotionDraft.item_id) {
      setErrorText('Escolhe a categoria.')
      return
    }

    try {
      setSaving(true)
      const input = {
        name: promotionDraft.name,
        description: promotionDraft.description || null,
        type: promotionDraft.type,
        target: promotionDraft.target,
        discount: Number(promotionDraft.discount ?? 0),
        start_date: promotionDraft.start_date || null,
        end_date: promotionDraft.end_date || null,
        items: buildItems(promotionDraft),
      }
      if (editingPromotionId) {
        await updateChainPromotion({ session, promotionId: editingPromotionId, input })
        setInfoText('Promocao atualizada.')
      } else {
        await createChainPromotion({ session, input })
        setInfoText('Promocao criada.')
      }
      setPromotionDraft(emptyPromotionDraft())
      setShowPromotionForm(false)
      setEditingPromotionId('')
      await load()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  function startEditPromotion(promotion) {
    const firstItem = promotion.promotionItems?.[0]
    setEditingPromotionId(promotion.id)
    setPromotionDraft({
      name: promotion.name,
      description: promotion.description ?? '',
      type: promotion.type,
      target: promotion.target,
      start_date: promotion.start_date ?? '',
      end_date: promotion.end_date ?? '',
      discount: String(promotion.discount ?? 10),
      item_id: firstItem?.item_id ?? '',
    })
    setShowPromotionForm(true)
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

  async function handleSaveCoupon() {
    if (!couponDraft.code.trim()) {
      setErrorText('Codigo de cupao obrigatorio.')
      return
    }
    if (couponDraft.target === 'PRODUCT' && !couponDraft.item_id) {
      setErrorText('Escolhe o produto.')
      return
    }
    if (couponDraft.target === 'CATEGORY' && !couponDraft.item_id) {
      setErrorText('Escolhe a categoria.')
      return
    }
    try {
      setSaving(true)
      const input = {
        code: couponDraft.code.trim().toUpperCase(),
        description: couponDraft.description || null,
        type: couponDraft.type,
        target: couponDraft.target,
        discount: Number(couponDraft.discount ?? 0),
        expiry_date: couponDraft.expiry_date || null,
        items: buildItems(couponDraft),
      }
      if (editingCouponId) {
        await updateChainCoupon({ session, couponId: editingCouponId, input })
        setInfoText('Cupao atualizado.')
      } else {
        await createChainCoupon({ session, input })
        setInfoText('Cupao criado.')
      }
      setCouponDraft(emptyCouponDraft())
      setShowCouponForm(false)
      setEditingCouponId('')
      await load()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  function startEditCoupon(coupon) {
    const firstItem = coupon.promotionItems?.[0]
    setEditingCouponId(coupon.id)
    setCouponDraft({
      code: coupon.code,
      description: coupon.description ?? '',
      type: coupon.type,
      target: coupon.target,
      discount: String(coupon.discount ?? 10),
      item_id: firstItem?.item_id ?? '',
      expiry_date: coupon.expiry_date ?? '',
    })
    setShowCouponForm(true)
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
                placeholder="Ex: Almocos de semana"
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
                placeholder="Ex: Desconto nos pedidos ao almoco"
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
                  setPromotionDraft((current) => ({
                    ...current,
                    target: event.target.value,
                    item_id: '',
                  }))
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
                placeholder="Ex: 10"
              />
            </label>
            {promotionDraft.target === 'PRODUCT' ? (
              <label>
                Produto
                <select
                  value={promotionDraft.item_id}
                  onChange={(event) =>
                    setPromotionDraft((current) => ({ ...current, item_id: event.target.value }))
                  }
                >
                  <option value="">— escolher —</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.category_name})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {promotionDraft.target === 'CATEGORY' ? (
              <label>
                Categoria
                <select
                  value={promotionDraft.item_id}
                  onChange={(event) =>
                    setPromotionDraft((current) => ({
                      ...current,
                      item_id: event.target.value,
                    }))
                  }
                >
                  <option value="">— escolher —</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
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
              onClick={handleSavePromotion}
              disabled={saving}
            >
              {editingPromotionId ? 'Guardar alteracoes' : 'Criar promocao'}
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
            <div className="rb-card-actions">
              <button
                type="button"
                className="rb-icon-mini"
                onClick={() => startEditPromotion(promotion)}
              >
                Editar
              </button>
              <button
                type="button"
                className="rb-icon-mini danger"
                onClick={() => setDeletePromotionTarget(promotion)}
              >
                Apagar
              </button>
            </div>
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
                placeholder="Ex: Cupao para a hora de almoco"
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
                  setCouponDraft((current) => ({
                    ...current,
                    target: event.target.value,
                    item_id: '',
                  }))
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
                placeholder="Ex: 10"
              />
            </label>
            {couponDraft.target === 'PRODUCT' ? (
              <label>
                Produto
                <select
                  value={couponDraft.item_id}
                  onChange={(event) =>
                    setCouponDraft((current) => ({ ...current, item_id: event.target.value }))
                  }
                >
                  <option value="">— escolher —</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.category_name})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {couponDraft.target === 'CATEGORY' ? (
              <label>
                Categoria
                <select
                  value={couponDraft.item_id}
                  onChange={(event) =>
                    setCouponDraft((current) => ({ ...current, item_id: event.target.value }))
                  }
                >
                  <option value="">— escolher —</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
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
              onClick={handleSaveCoupon}
              disabled={saving}
            >
              {editingCouponId ? 'Guardar alteracoes' : 'Criar cupao'}
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
            <div className="rb-card-actions">
              <button
                type="button"
                className="rb-icon-mini"
                onClick={() => startEditCoupon(coupon)}
              >
                Editar
              </button>
              <button
                type="button"
                className="rb-icon-mini danger"
                onClick={() => setDeleteCouponTarget(coupon)}
              >
                Apagar
              </button>
            </div>
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
