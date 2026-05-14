import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createRestaurantMenuProduct,
  deleteRestaurantMenuProduct,
  fetchRestaurantMenuProducts,
  updateRestaurantMenuProduct,
} from '../../../services/restaurantOpsService'

function categoryLabel(value) {
  return value?.trim() || 'Sem categoria'
}

function availabilityLabel(isAvailable) {
  return isAvailable ? 'Disponivel' : 'Indisponivel'
}

export function RestaurantMenuCatalogScreen({ session }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todas')
  const [editingProductId, setEditingProductId] = useState('')
  const [editDraft, setEditDraft] = useState({ price: '', prep: '', isAvailable: true })
  const [newProduct, setNewProduct] = useState({
    category: 'Pizzas',
    name: '',
    description: '',
    price: '',
    estimated_preparation_time_min: '',
    is_available: true,
  })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [infoText, setInfoText] = useState('')

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchRestaurantMenuProducts(session)
      setProducts(data)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    queueMicrotask(() => {
      loadProducts()
    })
  }, [loadProducts])

  const categories = useMemo(() => {
    const names = new Set(['Todas'])
    products.forEach((product) => names.add(categoryLabel(product.category)))
    return Array.from(names)
  }, [products])

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const category = categoryLabel(product.category)
      const matchesCategory = activeCategory === 'Todas' || category === activeCategory
      const query = searchText.trim().toLowerCase()
      const matchesSearch =
        query === '' ||
        (product.name ?? '').toLowerCase().includes(query) ||
        (product.description ?? '').toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, products, searchText])

  function startEdit(product) {
    setEditingProductId(product.restaurant_product_id)
    setEditDraft({
      price: String(Number(product.price ?? 0).toFixed(2)),
      prep: product.estimated_preparation_time_min ? String(product.estimated_preparation_time_min) : '',
      isAvailable: Boolean(product.is_available),
    })
  }

  function cancelEdit() {
    setEditingProductId('')
    setEditDraft({ price: '', prep: '', isAvailable: true })
  }

  async function saveEdit(productId) {
    try {
      setSaving(true)
      await updateRestaurantMenuProduct({
        session,
        input: {
          restaurant_product_id: productId,
          price: Number(editDraft.price),
          estimated_preparation_time_min:
            editDraft.prep.trim() === '' ? null : Number(editDraft.prep),
          is_available: Boolean(editDraft.isAvailable),
        },
      })

      setInfoText('Produto atualizado com sucesso.')
      setEditingProductId('')
      await loadProducts()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleAvailability(product) {
    try {
      setSaving(true)
      await updateRestaurantMenuProduct({
        session,
        input: {
          restaurant_product_id: product.restaurant_product_id,
          is_available: !product.is_available,
        },
      })

      setInfoText('Disponibilidade atualizada.')
      await loadProducts()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(product) {
    try {
      setSaving(true)
      const result = await deleteRestaurantMenuProduct({
        session,
        restaurantProductId: product.restaurant_product_id,
      })

      setInfoText(result.message ?? 'Produto removido.')
      await loadProducts()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreate() {
    if (!newProduct.name.trim() || !newProduct.category.trim() || !newProduct.price.trim()) {
      setErrorText('Preenche categoria, nome e preco para criar o prato.')
      return
    }

    try {
      setSaving(true)
      await createRestaurantMenuProduct({
        session,
        input: {
          category: newProduct.category.trim(),
          name: newProduct.name.trim(),
          description: newProduct.description.trim() || null,
          price: Number(newProduct.price),
          estimated_preparation_time_min:
            newProduct.estimated_preparation_time_min.trim() === ''
              ? null
              : Number(newProduct.estimated_preparation_time_min),
          is_available: Boolean(newProduct.is_available),
        },
      })

      setInfoText('Prato criado com sucesso.')
      setShowCreateForm(false)
      setNewProduct({
        category: 'Pizzas',
        name: '',
        description: '',
        price: '',
        estimated_preparation_time_min: '',
        is_available: true,
      })

      await loadProducts()
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
          <h2>Gestao de Menu</h2>
          <p>Gerir categorias, pratos e precos</p>
        </div>
        <button type="button" className="rb-primary" onClick={() => setShowCreateForm((state) => !state)}>
          {showCreateForm ? 'Fechar formulario' : '+ Adicionar prato'}
        </button>
      </header>

      {showCreateForm ? (
        <article className="rb-search-wrap">
          <div className="rb-login-form">
            <label>
              Categoria
              <input
                value={newProduct.category}
                onChange={(event) => setNewProduct((state) => ({ ...state, category: event.target.value }))}
              />
            </label>
            <label>
              Nome
              <input
                value={newProduct.name}
                onChange={(event) => setNewProduct((state) => ({ ...state, name: event.target.value }))}
              />
            </label>
            <label>
              Preco (EUR)
              <input
                type="number"
                min="0"
                step="0.01"
                value={newProduct.price}
                onChange={(event) => setNewProduct((state) => ({ ...state, price: event.target.value }))}
              />
            </label>
            <label>
              Tempo de preparacao (min)
              <input
                type="number"
                min="1"
                value={newProduct.estimated_preparation_time_min}
                onChange={(event) =>
                  setNewProduct((state) => ({ ...state, estimated_preparation_time_min: event.target.value }))
                }
              />
            </label>
            <label>
              Descricao
              <input
                value={newProduct.description}
                onChange={(event) => setNewProduct((state) => ({ ...state, description: event.target.value }))}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={newProduct.is_available}
                onChange={(event) => setNewProduct((state) => ({ ...state, is_available: event.target.checked }))}
              />
              {' '}Disponivel
            </label>
            <button type="button" className="rb-primary" onClick={handleCreate} disabled={saving}>
              Criar prato
            </button>
          </div>
        </article>
      ) : null}

      <article className="rb-search-wrap">
        <input
          className="rb-search"
          placeholder="Procurar pratos..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
        <div className="rb-filter-row">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`rb-filter ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
          <button type="button" className="rb-filter" onClick={loadProducts}>
            Atualizar
          </button>
        </div>
      </article>

      <div className="rb-menu-grid">
        {loading ? <p>A carregar menu...</p> : null}
        {!loading && visibleProducts.length === 0 ? <p>Sem pratos para mostrar.</p> : null}

        {visibleProducts.map((product) => {
          const isEditing = editingProductId === product.restaurant_product_id
          return (
            <article className="rb-menu-card" key={product.restaurant_product_id}>
              <div className="rb-menu-banner">{categoryLabel(product.category).toLowerCase()}</div>
              <div className="rb-menu-content">
                <div className="rb-menu-top">
                  <h4>{product.name ?? 'Produto'}</h4>
                  <strong>{Number(product.price ?? 0).toFixed(2)} EUR</strong>
                </div>
                <span className="rb-menu-tag">{categoryLabel(product.category)}</span>
                <p>{product.description || 'Sem descricao'}</p>
                <p>Preparacao: {product.estimated_preparation_time_min ?? '-'} min</p>
                <div className="rb-menu-bottom">
                  <span className={`rb-chip ${product.is_available ? 'done' : 'off'}`}>
                    {availabilityLabel(product.is_available)}
                  </span>
                  <div className="rb-card-actions">
                    <button type="button" className="rb-icon-mini" onClick={() => toggleAvailability(product)}>
                      {product.is_available ? 'Desativar' : 'Ativar'}
                    </button>
                    <button type="button" className="rb-icon-mini" onClick={() => startEdit(product)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="rb-icon-mini danger"
                      onClick={() => handleDelete(product)}
                    >
                      Apagar
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="rb-login-form">
                    <label>
                      Preco (EUR)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editDraft.price}
                        onChange={(event) =>
                          setEditDraft((state) => ({ ...state, price: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Preparacao (min)
                      <input
                        type="number"
                        min="1"
                        value={editDraft.prep}
                        onChange={(event) => setEditDraft((state) => ({ ...state, prep: event.target.value }))}
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={editDraft.isAvailable}
                        onChange={(event) =>
                          setEditDraft((state) => ({ ...state, isAvailable: event.target.checked }))
                        }
                      />
                      {' '}Disponivel
                    </label>
                    <div className="rb-card-actions">
                      <button
                        type="button"
                        className="rb-icon-mini"
                        onClick={() => saveEdit(product.restaurant_product_id)}
                        disabled={saving}
                      >
                        Guardar
                      </button>
                      <button type="button" className="rb-icon-mini danger" onClick={cancelEdit}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      {infoText ? <p className="rb-prep-note">{infoText}</p> : null}
      {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
    </section>
  )
}
