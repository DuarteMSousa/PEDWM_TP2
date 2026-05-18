import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createChainCategory,
  createRestaurantMenuProduct,
  deleteChainCategory,
  deleteRestaurantMenuProduct,
  fetchChainCategories,
  fetchProductOptionGroupsAdmin,
  fetchRestaurantMenuProducts,
  updateChainCategory,
  updateRestaurantMenuProduct,
  updateRestaurantMenuProductWithOptions,
} from '../../../services/restaurantOpsService'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'

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
  const [editDraft, setEditDraft] = useState({
    name: '',
    description: '',
    price: '',
    prep: '',
    isAvailable: true,
  })
  const [editOptionGroups, setEditOptionGroups] = useState([])
  const [showOptionsEditor, setShowOptionsEditor] = useState(false)
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)
  const [chainCategories, setChainCategories] = useState([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryDraft, setCategoryDraft] = useState({ id: '', name: '' })
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null)
  const [productOptionGroups, setProductOptionGroups] = useState([])

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

  async function startEdit(product) {
    setEditingProductId(product.restaurant_product_id)
    setEditDraft({
      name: product.name ?? '',
      description: product.description ?? '',
      price: String(Number(product.price ?? 0).toFixed(2)),
      prep: product.estimated_preparation_time_min ? String(product.estimated_preparation_time_min) : '',
      isAvailable: Boolean(product.is_available),
    })
    setShowOptionsEditor(false)
    try {
      const groups = await fetchProductOptionGroupsAdmin({ session, productId: product.product_id })
      setEditOptionGroups(groups)
    } catch {
      setEditOptionGroups([])
    }
  }

  function cancelEdit() {
    setEditingProductId('')
    setEditDraft({ name: '', description: '', price: '', prep: '', isAvailable: true })
    setEditOptionGroups([])
    setShowOptionsEditor(false)
  }

  async function saveEdit(product) {
    const productId = product.restaurant_product_id
    try {
      setSaving(true)

      const nameChanged = editDraft.name.trim() !== (product.name ?? '')
      const descriptionChanged = editDraft.description !== (product.description ?? '')
      const optionsChanged = showOptionsEditor

      if (nameChanged || descriptionChanged || optionsChanged) {
        await updateRestaurantMenuProductWithOptions({
          session,
          productId: product.product_id,
          name: nameChanged ? editDraft.name.trim() : undefined,
          description: descriptionChanged ? editDraft.description.trim() : undefined,
          optionGroups: optionsChanged ? editOptionGroups : undefined,
        })
      }

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
      cancelEdit()
      await loadProducts()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  function editAddOptionGroup() {
    setEditOptionGroups((current) => [
      ...current,
      { name: '', min_options: 0, max_options: 1, options: [] },
    ])
  }

  function editUpdateOptionGroup(index, patch) {
    setEditOptionGroups((current) =>
      current.map((group, idx) => (idx === index ? { ...group, ...patch } : group)),
    )
  }

  function editRemoveOptionGroup(index) {
    setEditOptionGroups((current) => current.filter((_, idx) => idx !== index))
  }

  function editAddOption(groupIndex) {
    setEditOptionGroups((current) =>
      current.map((group, idx) =>
        idx === groupIndex
          ? { ...group, options: [...group.options, { name: '', extra_price: 0, default_option: false }] }
          : group,
      ),
    )
  }

  function editUpdateOption(groupIndex, optionIndex, patch) {
    setEditOptionGroups((current) =>
      current.map((group, gIdx) =>
        gIdx === groupIndex
          ? {
              ...group,
              options: group.options.map((option, oIdx) =>
                oIdx === optionIndex ? { ...option, ...patch } : option,
              ),
            }
          : group,
      ),
    )
  }

  function editRemoveOption(groupIndex, optionIndex) {
    setEditOptionGroups((current) =>
      current.map((group, gIdx) =>
        gIdx === groupIndex
          ? { ...group, options: group.options.filter((_, oIdx) => oIdx !== optionIndex) }
          : group,
      ),
    )
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

  function requestDelete(product) {
    setDeleteTarget(product)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      setSaving(true)
      const result = await deleteRestaurantMenuProduct({
        session,
        restaurantProductId: deleteTarget.restaurant_product_id,
      })

      setInfoText(result.message ?? 'Produto desativado.')
      setDeleteTarget(null)
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
          option_groups: productOptionGroups,
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
      setProductOptionGroups([])

      await loadProducts()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function loadCategoriesForModal() {
    if (!session.chainId) {
      setErrorText('Sem chain_id na sessao.')
      return
    }
    try {
      const list = await fetchChainCategories({ session })
      setChainCategories(list)
    } catch (error) {
      setErrorText(error.message)
    }
  }

  function openCategoriesModal() {
    setShowCategoriesModal(true)
    loadCategoriesForModal()
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim()
    if (!name) {
      setErrorText('Nome de categoria obrigatorio.')
      return
    }
    try {
      setSaving(true)
      await createChainCategory({ session, name })
      setNewCategoryName('')
      await loadCategoriesForModal()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCategoryDraft() {
    if (!categoryDraft.id || !categoryDraft.name.trim()) return
    try {
      setSaving(true)
      await updateChainCategory({
        session,
        categoryId: categoryDraft.id,
        name: categoryDraft.name,
      })
      setCategoryDraft({ id: '', name: '' })
      await loadCategoriesForModal()
      await loadProducts()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCategoryConfirmed() {
    if (!deleteCategoryTarget) return
    try {
      setSaving(true)
      await deleteChainCategory({ session, categoryId: deleteCategoryTarget.id })
      setDeleteCategoryTarget(null)
      await loadCategoriesForModal()
      await loadProducts()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  function addOptionGroup() {
    setProductOptionGroups((current) => [
      ...current,
      { name: '', min_options: 0, max_options: 1, options: [] },
    ])
  }

  function updateOptionGroup(index, patch) {
    setProductOptionGroups((current) =>
      current.map((group, idx) => (idx === index ? { ...group, ...patch } : group)),
    )
  }

  function removeOptionGroup(index) {
    setProductOptionGroups((current) => current.filter((_, idx) => idx !== index))
  }

  function addOptionToGroup(groupIndex) {
    setProductOptionGroups((current) =>
      current.map((group, idx) =>
        idx === groupIndex
          ? {
              ...group,
              options: [...group.options, { name: '', extra_price: 0, default_option: false }],
            }
          : group,
      ),
    )
  }

  function updateOption(groupIndex, optionIndex, patch) {
    setProductOptionGroups((current) =>
      current.map((group, gIdx) =>
        gIdx === groupIndex
          ? {
              ...group,
              options: group.options.map((option, oIdx) =>
                oIdx === optionIndex ? { ...option, ...patch } : option,
              ),
            }
          : group,
      ),
    )
  }

  function removeOption(groupIndex, optionIndex) {
    setProductOptionGroups((current) =>
      current.map((group, gIdx) =>
        gIdx === groupIndex
          ? {
              ...group,
              options: group.options.filter((_, oIdx) => oIdx !== optionIndex),
            }
          : group,
      ),
    )
  }

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Gestao de Menu</h2>
          <p>Gerir categorias, pratos e precos</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="rb-btn-outline" onClick={openCategoriesModal}>
            Gerir categorias
          </button>
          <button type="button" className="rb-primary" onClick={() => setShowCreateForm((state) => !state)}>
            {showCreateForm ? 'Fechar criacao' : '+ Adicionar prato'}
          </button>
        </div>
      </header>

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
                      onClick={() => requestDelete(product)}
                    >
                      Apagar
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="rb-login-form">
                    <label>
                      Nome do prato
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(event) =>
                          setEditDraft((state) => ({ ...state, name: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Descricao
                      <input
                        type="text"
                        value={editDraft.description}
                        onChange={(event) =>
                          setEditDraft((state) => ({ ...state, description: event.target.value }))
                        }
                      />
                    </label>
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

                    <button
                      type="button"
                      className="rb-btn-outline"
                      onClick={() => setShowOptionsEditor((state) => !state)}
                    >
                      {showOptionsEditor ? 'Esconder option groups' : 'Editar option groups'}
                    </button>

                    {showOptionsEditor ? (
                      <div className="rb-option-editor">
                        <div className="rb-option-editor-head">
                          <strong>Grupos de opcoes</strong>
                          <button type="button" className="rb-btn-outline" onClick={editAddOptionGroup}>
                            + Adicionar grupo
                          </button>
                        </div>
                        {editOptionGroups.length === 0 ? <small>Sem grupos.</small> : null}
                        {editOptionGroups.map((group, gIdx) => (
                          <div className="rb-option-group" key={`edit-group-${gIdx}`}>
                            <div className="rb-option-group-head">
                              <input
                                placeholder="Nome do grupo"
                                value={group.name}
                                onChange={(event) =>
                                  editUpdateOptionGroup(gIdx, { name: event.target.value })
                                }
                              />
                              <button
                                type="button"
                                className="rb-icon-mini danger"
                                onClick={() => editRemoveOptionGroup(gIdx)}
                              >
                                Remover
                              </button>
                            </div>
                            <div className="rb-option-group-rules">
                              <label>
                                Min
                                <input
                                  type="number"
                                  min="0"
                                  value={group.min_options}
                                  onChange={(event) =>
                                    editUpdateOptionGroup(gIdx, { min_options: Number(event.target.value) })
                                  }
                                />
                              </label>
                              <label>
                                Max
                                <input
                                  type="number"
                                  min="1"
                                  value={group.max_options}
                                  onChange={(event) =>
                                    editUpdateOptionGroup(gIdx, { max_options: Number(event.target.value) })
                                  }
                                />
                              </label>
                            </div>
                            {group.options.map((option, oIdx) => (
                              <div className="rb-option-row" key={`edit-opt-${gIdx}-${oIdx}`}>
                                <input
                                  placeholder="Nome opcao"
                                  value={option.name}
                                  onChange={(event) =>
                                    editUpdateOption(gIdx, oIdx, { name: event.target.value })
                                  }
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Extra"
                                  value={option.extra_price}
                                  onChange={(event) =>
                                    editUpdateOption(gIdx, oIdx, {
                                      extra_price: Number(event.target.value),
                                    })
                                  }
                                />
                                <label className="rb-option-default">
                                  <input
                                    type="checkbox"
                                    checked={option.default_option}
                                    onChange={(event) =>
                                      editUpdateOption(gIdx, oIdx, {
                                        default_option: event.target.checked,
                                      })
                                    }
                                  />
                                  default
                                </label>
                                <button
                                  type="button"
                                  className="rb-icon-mini danger"
                                  onClick={() => editRemoveOption(gIdx, oIdx)}
                                >
                                  x
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="rb-btn-outline"
                              onClick={() => editAddOption(gIdx)}
                            >
                              + Adicionar opcao
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="rb-card-actions">
                      <button
                        type="button"
                        className="rb-icon-mini"
                        onClick={() => saveEdit(product)}
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

      <ConfirmDialog
        open={showCreateForm}
        title="Criar prato"
        description="Preenche os dados do prato e confirma para adicionar ao menu."
        confirmLabel="Criar prato"
        cancelLabel="Fechar"
        cardClassName="rb-dialog-card-wide"
        bodyClassName="rb-create-modal-body"
        loading={saving}
        onCancel={() => {
          if (!saving) setShowCreateForm(false)
        }}
        onConfirm={handleCreate}
      >
        <div className="rb-login-form rb-create-product-modal-form">
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
          <div className="rb-option-editor">
            <div className="rb-option-editor-head">
              <strong>Grupos de opcoes</strong>
              <button type="button" className="rb-btn-outline" onClick={addOptionGroup}>
                + Adicionar grupo
              </button>
            </div>
            {productOptionGroups.length === 0 ? (
              <small>Sem grupos. Util para escolhas como "tamanho" ou "molho".</small>
            ) : null}

            {productOptionGroups.map((group, groupIndex) => (
              <div className="rb-option-group" key={`group-${groupIndex}`}>
                <div className="rb-option-group-head">
                  <input
                    placeholder="Nome do grupo (ex: Tamanho)"
                    value={group.name}
                    onChange={(event) =>
                      updateOptionGroup(groupIndex, { name: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="rb-icon-mini danger"
                    onClick={() => removeOptionGroup(groupIndex)}
                  >
                    Remover grupo
                  </button>
                </div>
                <div className="rb-option-group-rules">
                  <label>
                    Min
                    <input
                      type="number"
                      min="0"
                      value={group.min_options}
                      onChange={(event) =>
                        updateOptionGroup(groupIndex, {
                          min_options: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Max
                    <input
                      type="number"
                      min="1"
                      value={group.max_options}
                      onChange={(event) =>
                        updateOptionGroup(groupIndex, {
                          max_options: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                </div>

                {group.options.map((option, optionIndex) => (
                  <div className="rb-option-row" key={`option-${groupIndex}-${optionIndex}`}>
                    <input
                      placeholder="Nome opcao"
                      value={option.name}
                      onChange={(event) =>
                        updateOption(groupIndex, optionIndex, { name: event.target.value })
                      }
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Extra"
                      value={option.extra_price}
                      onChange={(event) =>
                        updateOption(groupIndex, optionIndex, {
                          extra_price: Number(event.target.value),
                        })
                      }
                    />
                    <label className="rb-option-default">
                      <input
                        type="checkbox"
                        checked={option.default_option}
                        onChange={(event) =>
                          updateOption(groupIndex, optionIndex, {
                            default_option: event.target.checked,
                          })
                        }
                      />
                      default
                    </label>
                    <button
                      type="button"
                      className="rb-icon-mini danger"
                      onClick={() => removeOption(groupIndex, optionIndex)}
                    >
                      x
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="rb-btn-outline"
                  onClick={() => addOptionToGroup(groupIndex)}
                >
                  + Adicionar opcao
                </button>
              </div>
            ))}
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Desativar produto"
        description={`Vais desativar "${deleteTarget?.name ?? 'produto'}". Os clientes deixam de o ver no menu.`}
        confirmLabel="Desativar"
        destructive
        loading={saving}
        onCancel={() => {
          if (!saving) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={showCategoriesModal}
        title="Gerir categorias"
        description="Adicionar, renomear ou apagar categorias da cadeia."
        confirmLabel="Fechar"
        loading={saving}
        onCancel={() => {
          if (!saving) {
            setShowCategoriesModal(false)
            setCategoryDraft({ id: '', name: '' })
          }
        }}
        onConfirm={() => {
          if (!saving) {
            setShowCategoriesModal(false)
            setCategoryDraft({ id: '', name: '' })
          }
        }}
      >
        <div className="rb-categories-list">
          {chainCategories.length === 0 ? <p>Sem categorias ainda.</p> : null}
          {chainCategories.map((category) => (
            <div key={category.id} className="rb-category-row">
              {categoryDraft.id === category.id ? (
                <>
                  <input
                    value={categoryDraft.name}
                    onChange={(event) =>
                      setCategoryDraft((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                  <div className="rb-card-actions">
                    <button
                      type="button"
                      className="rb-icon-mini"
                      onClick={handleSaveCategoryDraft}
                      disabled={saving}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="rb-icon-mini"
                      onClick={() => setCategoryDraft({ id: '', name: '' })}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <strong>{category.name}</strong>
                  <div className="rb-card-actions">
                    <button
                      type="button"
                      className="rb-icon-mini"
                      onClick={() =>
                        setCategoryDraft({ id: category.id, name: category.name })
                      }
                    >
                      Renomear
                    </button>
                    <button
                      type="button"
                      className="rb-icon-mini danger"
                      onClick={() => setDeleteCategoryTarget(category)}
                    >
                      Apagar
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="rb-category-form">
          <input
            placeholder="Nova categoria"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
          />
          <button type="button" className="rb-btn-accept" onClick={handleCreateCategory} disabled={saving}>
            Criar
          </button>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleteCategoryTarget)}
        title="Apagar categoria"
        description={`Apagar "${deleteCategoryTarget?.name ?? ''}" da cadeia. Pratos sem categoria ficam sem categoria.`}
        confirmLabel="Apagar"
        destructive
        loading={saving}
        onCancel={() => {
          if (!saving) setDeleteCategoryTarget(null)
        }}
        onConfirm={handleDeleteCategoryConfirmed}
      />
    </section>
  )
}
