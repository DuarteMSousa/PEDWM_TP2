export function RestaurantMenuCatalogScreen() {
  const products = [
    {
      name: 'Pizza Margherita',
      price: '12.50',
      description: 'Molho de tomate, mozzarella, manjericao fresco',
      status: 'Disponivel',
      statusTone: 'done',
    },
    {
      name: 'Pizza Pepperoni',
      price: '14.00',
      description: 'Molho de tomate, mozzarella, pepperoni',
      status: 'Disponivel',
      statusTone: 'done',
    },
    {
      name: 'Pizza Vegetariana',
      price: '13.50',
      description: 'Molho de tomate, mozzarella, legumes grelhados',
      status: 'Indisponivel',
      statusTone: 'off',
    },
    {
      name: 'Pizza Quatro Queijos',
      price: '15.20',
      description: 'Mozzarella, gorgonzola, parmesao, provolone',
      status: 'Disponivel',
      statusTone: 'done',
    },
    {
      name: 'Pizza Prosciutto',
      price: '14.80',
      description: 'Tomate, mozzarella, presunto, oregano',
      status: 'Disponivel',
      statusTone: 'done',
    },
    {
      name: 'Pizza Frango BBQ',
      price: '15.90',
      description: 'Molho barbecue, frango, cebola, mozzarella',
      status: 'Indisponivel',
      statusTone: 'off',
    },
  ]

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Gestao de Menu</h2>
          <p>Gerir categorias, pratos e precos</p>
        </div>
        <button type="button" className="rb-primary">
          + Adicionar prato
        </button>
      </header>

      <article className="rb-search-wrap">
        <input className="rb-search" placeholder="Procurar pratos..." />
        <div className="rb-filter-row">
          <button type="button" className="rb-filter active">
            Todas
          </button>
          <button type="button" className="rb-filter">
            Pizzas
          </button>
          <button type="button" className="rb-filter">
            Massas
          </button>
          <button type="button" className="rb-filter">
            Sobremesas
          </button>
        </div>
      </article>

      <div className="rb-menu-grid">
        {products.map((product) => (
          <article className="rb-menu-card" key={product.name}>
            <div className="rb-menu-banner">pizza</div>
            <div className="rb-menu-content">
              <div className="rb-menu-top">
                <h4>{product.name}</h4>
                <strong>{product.price} EUR</strong>
              </div>
              <span className="rb-menu-tag">Pizzas</span>
              <p>{product.description}</p>
              <div className="rb-menu-bottom">
                <span className={`rb-chip ${product.statusTone}`}>{product.status}</span>
                <div className="rb-card-actions">
                  <button type="button" className="rb-icon-mini">
                    Editar
                  </button>
                  <button type="button" className="rb-icon-mini danger">
                    Apagar
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
