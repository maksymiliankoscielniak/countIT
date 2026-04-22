import './App.css'

import { useEffect, useMemo, useRef, useState } from 'react'

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

type AuthUser = {
  id: string
  email: string
  displayName: string
  password: string
}

type Session = {
  userId: string
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

function addDays(dateKey: string, deltaDays: number) {
  const d = new Date(`${dateKey}T00:00:00`)
  d.setDate(d.getDate() + deltaDays)
  return toISODateKey(d)
}

function formatDayLabel(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function weekdayLetter(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1).toUpperCase()
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
  const [dragMealId, setDragMealId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ mealId: string; position: 'before' | 'after' } | null>(null)
  const dayListRef = useRef<HTMLDivElement | null>(null)

  const [daysRange, setDaysRange] = useState<{ start: string; end: string }>(() => ({
    start: addDays(todayKey, -60),
    end: addDays(todayKey, 60),
  }))

  const [isDaysOpenMobile, setIsDaysOpenMobile] = useState(false)

  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [users, setUsers] = useState<AuthUser[]>(() => {
    try {
      const raw = localStorage.getItem('countit_users')
      if (!raw) return []
      const parsed = JSON.parse(raw) as AuthUser[]
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch {
      return []
    }
  })
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem('countit_session')
      if (!raw) return null
      return JSON.parse(raw) as Session
    } catch {
      return null
    }
  })

  useEffect(() => {
    localStorage.setItem('countit_users', JSON.stringify(users))
  }, [users])

  useEffect(() => {
    if (session) localStorage.setItem('countit_session', JSON.stringify(session))
    else localStorage.removeItem('countit_session')
  }, [session])

  const days = useMemo(() => {
    const out: string[] = []
    let cur = daysRange.start
    while (cur <= daysRange.end) {
      out.push(cur)
      cur = addDays(cur, 1)
    }
    return out
  }, [daysRange])

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

  function reorderMealsAt(fromId: string, targetId: string, position: 'before' | 'after') {
    if (fromId === targetId) return
    const fromIdx = currentMeals.findIndex((m) => m.id === fromId)
    const targetIdx = currentMeals.findIndex((m) => m.id === targetId)
    if (fromIdx === -1 || targetIdx === -1) return
    const next = [...currentMeals]
    const [item] = next.splice(fromIdx, 1)
    let insertAt = targetIdx
    if (position === 'after') insertAt = targetIdx + 1
    if (fromIdx < insertAt) insertAt -= 1
    insertAt = clamp(insertAt, 0, next.length)
    next.splice(insertAt, 0, item)
    setMeals(next)
  }

  const currentUser = useMemo(() => {
    if (!session) return null
    return users.find((u) => u.id === session.userId) ?? null
  }, [session, users])

  function openAuth(mode: 'login' | 'signup') {
    setAuthMode(mode)
    setAuthError(null)
    setAuthEmail('')
    setAuthPassword('')
    setAuthDisplayName('')
    setIsAuthOpen(true)
  }

  function logout() {
    setSession(null)
  }

  function submitAuth() {
    setAuthError(null)
    const email = authEmail.trim().toLowerCase()
    const password = authPassword
    const displayName = authDisplayName.trim()

    if (!email.includes('@')) {
      setAuthError('Enter a valid email.')
      return
    }
    if (password.length < 4) {
      setAuthError('Password must be at least 4 characters (temporary frontend-only).')
      return
    }

    if (authMode === 'signup') {
      if (displayName.length < 2) {
        setAuthError('Display name must be at least 2 characters.')
        return
      }
      const exists = users.some((u) => u.email === email)
      if (exists) {
        setAuthError('Account already exists. Try logging in.')
        return
      }
      const user: AuthUser = { id: uid('user'), email, password, displayName }
      setUsers((prev) => [...prev, user])
      setSession({ userId: user.id })
      setIsAuthOpen(false)
      return
    }

    const user = users.find((u) => u.email === email && u.password === password)
    if (!user) {
      setAuthError('Wrong email or password.')
      return
    }
    setSession({ userId: user.id })
    setIsAuthOpen(false)
  }

  function onDaysScroll() {
    const el = dayListRef.current
    if (!el) return
    const nearTop = el.scrollTop < 120
    const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 120
    if (nearTop) {
      setDaysRange((r) => ({ ...r, start: addDays(r.start, -90) }))
    } else if (nearBottom) {
      setDaysRange((r) => ({ ...r, end: addDays(r.end, 90) }))
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">countIT</div>
        <div className="topbarMeta">
          <button className="ghostButton mobileOnly" type="button" onClick={() => setIsDaysOpenMobile((v) => !v)}>
            Days
          </button>
          <div className="topbarDay">{selectedDayKey === todayKey ? 'Today' : formatDayLabel(selectedDayKey)}</div>
          {currentUser ? (
            <div className="userChip">
              <span className="userChipName">{currentUser.displayName}</span>
              <button className="userChipLogout" type="button" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="authButtons">
              <button className="ghostButton" type="button" onClick={() => openAuth('login')}>
                Log in
              </button>
              <button className="ghostButton" type="button" onClick={() => openAuth('signup')}>
                Sign up
              </button>
            </div>
          )}
        </div>
      </header>

      <aside className={`left ${isDaysOpenMobile ? 'openMobile' : ''}`}>
        <div className="panelTitle">Days</div>
        <div className="dayList" role="listbox" aria-label="Days" ref={dayListRef} onScroll={onDaysScroll}>
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
                  setIsDaysOpenMobile(false)
                }}
                role="option"
                aria-selected={isActive}
              >
                <span className="dayLabel">{label}</span>
                <span className="dayMini" aria-hidden="true">
                  {weekdayLetter(key)}
                </span>
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
                className={`mealCard ${dragMealId === meal.id ? 'dragging' : ''}`}
                draggable
                onDragStart={() => {
                  dragMealIdRef.current = meal.id
                  setDragMealId(meal.id)
                }}
                onDragEnd={() => {
                  dragMealIdRef.current = null
                  setDragMealId(null)
                  setDropTarget(null)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => {
                  const from = dragMealIdRef.current
                  if (!from || from === meal.id) return
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  const y = e.clientY - rect.top
                  const position = y < rect.height / 2 ? 'before' : 'after'
                  setDropTarget({ mealId: meal.id, position })
                }}
                onDrop={() => {
                  const from = dragMealIdRef.current
                  dragMealIdRef.current = null
                  if (from && dropTarget?.mealId === meal.id) reorderMealsAt(from, meal.id, dropTarget.position)
                  else if (from) reorderMeals(from, meal.id)
                  setDragMealId(null)
                  setDropTarget(null)
                }}
              >
                {dropTarget?.mealId === meal.id ? (
                  <div className={`dropIndicator ${dropTarget.position}`} aria-hidden="true" />
                ) : null}
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

      {isAuthOpen ? (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsAuthOpen(false)
          }}
        >
          <div className="modalCard">
            <div className="modalHeader">
              <div className="modalTitle">{authMode === 'login' ? 'Log in' : 'Sign up'}</div>
              <button className="iconButton danger" type="button" onClick={() => setIsAuthOpen(false)} title="Close">
                ×
              </button>
            </div>

            <div className="modalTabs">
              <button
                type="button"
                className={`tabButton ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Log in
              </button>
              <button
                type="button"
                className={`tabButton ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign up
              </button>
            </div>

            <div className="formGrid">
              {authMode === 'signup' ? (
                <label className="field">
                  <span className="fieldLabel">Display name</span>
                  <input
                    className="searchInput"
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    placeholder="e.g. Edek"
                  />
                </label>
              ) : null}

              <label className="field">
                <span className="fieldLabel">Email</span>
                <input
                  className="searchInput"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@email.com"
                  inputMode="email"
                />
              </label>

              <label className="field">
                <span className="fieldLabel">Password</span>
                <input
                  className="searchInput"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••"
                  type="password"
                />
              </label>

              {authError ? <div className="formError">{authError}</div> : null}

              <button className="primaryButton" type="button" onClick={submitAuth}>
                {authMode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
