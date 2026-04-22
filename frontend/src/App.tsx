import './App.css'

import { useMemo, useRef, useState } from 'react'

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber'

type Product = {
  id: string
  name: string
  macros: Record<MacroKey, number>
}

type Meal = {
  id: string
  name: string
  products: Product[]
  isSearching?: boolean
  searchQuery?: string
}

type DayState = {
  meals: Meal[]
}

const MACRO_LABELS: Record<MacroKey, string> = {
  calories: 'Calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fats',
  fiber: 'Fiber',
}

const DEFAULT_GOALS: Record<MacroKey, number> = {
  calories: 2200,
  protein: 160,
  carbs: 260,
  fat: 70,
  fiber: 30,
}

const MOCK_CATALOG: Array<Omit<Product, 'id'>> = [
  { name: 'Chicken breast (100g)', macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 } },
  { name: 'Egg (1 large)', macros: { calories: 72, protein: 6.3, carbs: 0.4, fat: 4.8, fiber: 0 } },
  { name: 'Greek yogurt (200g)', macros: { calories: 146, protein: 20, carbs: 8, fat: 4, fiber: 0 } },
  { name: 'Rice cooked (150g)', macros: { calories: 195, protein: 4, carbs: 42, fat: 0.4, fiber: 0.6 } },
  { name: 'Oats (60g)', macros: { calories: 228, protein: 7.5, carbs: 39, fat: 4.2, fiber: 6 } },
  { name: 'Banana (1 medium)', macros: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1 } },
  { name: 'Apple (1 medium)', macros: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4 } },
  { name: 'Avocado (1/2)', macros: { calories: 120, protein: 1.5, carbs: 6, fat: 11, fiber: 5 } },
  { name: 'Salmon (120g)', macros: { calories: 240, protein: 26, carbs: 0, fat: 14, fiber: 0 } },
  { name: 'Olive oil (1 tbsp)', macros: { calories: 119, protein: 0, carbs: 0, fat: 13.5, fiber: 0 } },
  { name: 'Broccoli (150g)', macros: { calories: 51, protein: 4.2, carbs: 10, fat: 0.6, fiber: 5.1 } },
  { name: 'Protein shake', macros: { calories: 220, protein: 35, carbs: 10, fat: 5, fiber: 2 } },
]

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toISODateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function formatDayLabel(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function uid(prefix = 'id') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}_${crypto.randomUUID()}`
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function sumMacros(products: Product[]) {
  const totals: Record<MacroKey, number> = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  for (const p of products) {
    totals.calories += p.macros.calories
    totals.protein += p.macros.protein
    totals.carbs += p.macros.carbs
    totals.fat += p.macros.fat
    totals.fiber += p.macros.fiber
  }
  for (const k of Object.keys(totals) as MacroKey[]) totals[k] = Math.round(totals[k] * 10) / 10
  return totals
}

export default function App() {
  const todayKey = useMemo(() => toISODateKey(new Date()), [])
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey)
  const [dayData, setDayData] = useState<Record<string, DayState>>({ [todayKey]: { meals: [] } })
  const dragMealIdRef = useRef<string | null>(null)

  const days = useMemo(() => {
    const out: string[] = []
    const now = new Date()
    // show ~2 weeks around today
    for (let i = 10; i >= 1; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      out.push(toISODateKey(d))
    }
    out.push(toISODateKey(now))
    for (let i = 1; i <= 4; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      out.push(toISODateKey(d))
    }
    return out
  }, [])

  const currentMeals = useMemo(() => dayData[selectedDayKey]?.meals ?? [], [dayData, selectedDayKey])

  const dayTotals = useMemo(() => {
    const allProducts = currentMeals.flatMap((m) => m.products)
    return sumMacros(allProducts)
  }, [currentMeals])

  function ensureDay(key: string) {
    setDayData((prev) => {
      if (prev[key]) return prev
      return { ...prev, [key]: { meals: [] } }
    })
  }

  function setMeals(nextMeals: Meal[]) {
    setDayData((prev) => ({
      ...prev,
      [selectedDayKey]: { meals: nextMeals },
    }))
  }

  function addMeal() {
    const n = currentMeals.length + 1
    const meal: Meal = { id: uid('meal'), name: `Meal ${n}`, products: [], isSearching: false, searchQuery: '' }
    setMeals([...currentMeals, meal])
  }

  function removeMeal(mealId: string) {
    setMeals(currentMeals.filter((m) => m.id !== mealId))
  }

  function moveMeal(mealId: string, dir: -1 | 1) {
    const idx = currentMeals.findIndex((m) => m.id === mealId)
    if (idx === -1) return
    const next = [...currentMeals]
    const to = clamp(idx + dir, 0, next.length - 1)
    if (to === idx) return
    const [item] = next.splice(idx, 1)
    next.splice(to, 0, item)
    setMeals(next)
  }

  function openSearch(mealId: string) {
    setMeals(
      currentMeals.map((m) =>
        m.id === mealId ? { ...m, isSearching: true, searchQuery: m.searchQuery ?? '' } : { ...m, isSearching: false },
      ),
    )
  }

  function closeSearch(mealId: string) {
    setMeals(currentMeals.map((m) => (m.id === mealId ? { ...m, isSearching: false } : m)))
  }

  function setSearchQuery(mealId: string, q: string) {
    setMeals(currentMeals.map((m) => (m.id === mealId ? { ...m, searchQuery: q } : m)))
  }

  function addProductToMeal(mealId: string, item: Omit<Product, 'id'>) {
    const product: Product = { id: uid('prod'), name: item.name, macros: item.macros }
    setMeals(
      currentMeals.map((m) =>
        m.id === mealId ? { ...m, products: [...m.products, product], isSearching: false, searchQuery: '' } : m,
      ),
    )
  }

  function removeProduct(mealId: string, productId: string) {
    const next = currentMeals
      .map((m) => (m.id === mealId ? { ...m, products: m.products.filter((p) => p.id !== productId) } : m))
      .filter((m) => (m.id === mealId ? m.products.length > 0 : true))
    // if the targeted meal became empty -> it disappears
    setMeals(next)
  }

  function reorderMeals(fromId: string, toId: string) {
    if (fromId === toId) return
    const fromIdx = currentMeals.findIndex((m) => m.id === fromId)
    const toIdx = currentMeals.findIndex((m) => m.id === toId)
    if (fromIdx === -1 || toIdx === -1) return
    const next = [...currentMeals]
    const [item] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, item)
    setMeals(next)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">countIT</div>
        <div className="topbarMeta">
          <div className="topbarDay">{selectedDayKey === todayKey ? 'Today' : formatDayLabel(selectedDayKey)}</div>
        </div>
      </header>

      <aside className="left">
        <div className="panelTitle">Days</div>
        <div className="dayList" role="listbox" aria-label="Days">
          {days.map((key) => {
            const isActive = key === selectedDayKey
            const label = key === todayKey ? `Today · ${formatDayLabel(key)}` : formatDayLabel(key)
            return (
              <button
                key={key}
                className={`dayItem ${isActive ? 'active' : ''}`}
                onClick={() => {
                  ensureDay(key)
                  setSelectedDayKey(key)
                }}
                role="option"
                aria-selected={isActive}
              >
                <span className="dayLabel">{label}</span>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="center" aria-label="Meals">
        <div className="centerHeader">
          <div className="panelTitle">Meals</div>
          <button className="ghostButton" onClick={addMeal} type="button">
            + New meal
          </button>
        </div>

        <div className="mealList">
          {currentMeals.length === 0 ? (
            <button className="addMealTile" onClick={addMeal} type="button">
              <span className="addMealTileText">Create your first meal</span>
              <span className="addMealTilePlus" aria-hidden="true">
                +
              </span>
            </button>
          ) : null}

          {currentMeals.map((meal) => {
            const filtered = (() => {
              const q = (meal.searchQuery ?? '').trim().toLowerCase()
              if (!q) return MOCK_CATALOG.slice(0, 8)
              return MOCK_CATALOG.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 10)
            })()

            const mealTotals = sumMacros(meal.products)

            return (
              <section
                key={meal.id}
                className="mealCard"
                draggable
                onDragStart={() => {
                  dragMealIdRef.current = meal.id
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const from = dragMealIdRef.current
                  dragMealIdRef.current = null
                  if (from) reorderMeals(from, meal.id)
                }}
              >
                <div className="mealHeader">
                  <div className="mealTitle">
                    <span className="dragHint" title="Drag to reorder" aria-hidden="true">
                      ⋮⋮
                    </span>
                    <span>{meal.name}</span>
                  </div>
                  <div className="mealActions">
                    <button className="iconButton" type="button" onClick={() => moveMeal(meal.id, -1)} title="Move up">
                      ↑
                    </button>
                    <button className="iconButton" type="button" onClick={() => moveMeal(meal.id, 1)} title="Move down">
                      ↓
                    </button>
                    <button className="iconButton danger" type="button" onClick={() => removeMeal(meal.id)} title="Remove meal">
                      ×
                    </button>
                  </div>
                </div>

                <div className="mealMeta">
                  <span className="pill">{meal.products.length} items</span>
                  <span className="pill subtle">{mealTotals.calories} kcal</span>
                  <span className="pill subtle">P {mealTotals.protein}g</span>
                  <span className="pill subtle">C {mealTotals.carbs}g</span>
                  <span className="pill subtle">F {mealTotals.fat}g</span>
                </div>

                {meal.products.length === 0 ? (
                  <button className="addProductInline" onClick={() => openSearch(meal.id)} type="button">
                    <span className="addProductInlineText">Add product</span>
                    <span className="addProductInlinePlus" aria-hidden="true">
                      +
                    </span>
                  </button>
                ) : (
                  <>
                    <ul className="productList">
                      {meal.products.map((p) => (
                        <li key={p.id} className="productRow">
                          <div className="productName">{p.name}</div>
                          <div className="productMacros">
                            <span>{p.macros.calories} kcal</span>
                            <span>P {p.macros.protein}g</span>
                            <span>C {p.macros.carbs}g</span>
                            <span>F {p.macros.fat}g</span>
                          </div>
                          <button className="iconButton danger" type="button" onClick={() => removeProduct(meal.id, p.id)} title="Remove">
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>

                    <button className="addProductInline compact" onClick={() => openSearch(meal.id)} type="button">
                      <span className="addProductInlineText">Add another product</span>
                      <span className="addProductInlinePlus" aria-hidden="true">
                        +
                      </span>
                    </button>
                  </>
                )}

                {meal.isSearching ? (
                  <div className="searchArea">
                    <div className="searchRow">
                      <input
                        className="searchInput"
                        value={meal.searchQuery ?? ''}
                        placeholder="Search products..."
                        onChange={(e) => setSearchQuery(meal.id, e.target.value)}
                        autoFocus
                      />
                      <button className="ghostButton" type="button" onClick={() => closeSearch(meal.id)}>
                        Close
                      </button>
                    </div>
                    <div className="searchResults" role="listbox" aria-label="Products">
                      {filtered.length === 0 ? (
                        <div className="emptyHint">No matches.</div>
                      ) : (
                        filtered.map((item) => (
                          <button
                            key={item.name}
                            className="resultItem"
                            type="button"
                            onClick={() => addProductToMeal(meal.id, item)}
                          >
                            <div className="resultName">{item.name}</div>
                            <div className="resultMacros">
                              {item.macros.calories} kcal · P {item.macros.protein}g · C {item.macros.carbs}g · F{' '}
                              {item.macros.fat}g · Fi {item.macros.fiber}g
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      </main>

      <aside className="right" aria-label="Macros">
        <div className="panelTitle">Macros</div>
        <div className="macroList">
          {(Object.keys(MACRO_LABELS) as MacroKey[]).map((k) => {
            const value = dayTotals[k]
            const goal = DEFAULT_GOALS[k]
            const pct = goal > 0 ? clamp(value / goal, 0, 1) : 0
            return (
              <div key={k} className="macroRow">
                <div className="macroRowTop">
                  <div className="macroName">{MACRO_LABELS[k]}</div>
                  <div className="macroValue">
                    {value}
                    <span className="macroGoal"> / {goal}</span>
                  </div>
                </div>
                <div className="macroBar" aria-hidden="true">
                  <div className="macroBarFill" style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
