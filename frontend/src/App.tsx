import './App.css'

import { useEffect, useMemo, useRef, useState } from 'react'

import { apiFetch } from './lib/api'

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
  isRenaming?: boolean
  renameDraft?: string
}

type DayState = {
  meals: Meal[]
}

type ApiUser = {
  id: string
  email: string
  displayName: string
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

function weekdayShort(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

function monthShort(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short' })
}

function dayOfMonth(dateKey: string) {
  return Number(dateKey.slice(8, 10))
}

function monthKey(dateKey: string) {
  return dateKey.slice(0, 7) // YYYY-MM
}

function monthLabel(dateKeyOrMonthKey: string) {
  const key = dateKeyOrMonthKey.length === 7 ? `${dateKeyOrMonthKey}-01` : dateKeyOrMonthKey
  const d = new Date(`${key}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function daysInMonth(month: string) {
  const first = new Date(`${month}-01T00:00:00`)
  const last = new Date(first)
  last.setMonth(first.getMonth() + 1)
  last.setDate(0)
  const out: string[] = []
  for (let day = 1; day <= last.getDate(); day++) {
    const d = new Date(first)
    d.setDate(day)
    out.push(toISODateKey(d))
  }
  return out
}

function addMonths(monthKeyStr: string, delta: number) {
  const d = new Date(`${monthKeyStr}-01T00:00:00`)
  d.setMonth(d.getMonth() + delta)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
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
  const [activeMonth, setActiveMonth] = useState(() => monthKey(todayKey))

  const [isDaysOpenMobile, setIsDaysOpenMobile] = useState(false)

  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [authRememberMe, setAuthRememberMe] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)

  const [productSearch, setProductSearch] = useState<
    Record<string, { items: Array<Omit<Product, 'id'>>; isLoading: boolean; error: string | null }>
  >({})

  const searchTimersRef = useRef<Record<string, number>>({})

  const [warningAccepted, setWarningAccepted] = useState(() => {
    try {
      return localStorage.getItem('warningAccepted') === 'true'
    } catch {
      return false
    }
  })

  const [customMacros, setCustomMacros] = useState<Record<MacroKey, number>>(() => {
    try {
      const saved = localStorage.getItem('customMacros')
      if (saved) return JSON.parse(saved)
    } catch {}
    return DEFAULT_GOALS
  })

  const [pendingAdd, setPendingAdd] = useState<{ mealId: string; item: Omit<Product, 'id'>; defaultWeight: string } | null>(null)
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [calcSex, setCalcSex] = useState<'male' | 'female'>('male')
  const [calcAge, setCalcAge] = useState<number>(25)
  const [calcWeight, setCalcWeight] = useState<number>(75)
  const [calcHeight, setCalcHeight] = useState<number>(175)
  const [calcActivity, setCalcActivity] = useState<number>(1.55)

  function applyCalculatedMacros() {
    let bmr = 10 * calcWeight + 6.25 * calcHeight - 5 * calcAge
    if (calcSex === 'male') bmr += 5
    else bmr -= 161
    const tdee = Math.round(bmr * calcActivity)
    const nextMacros = {
      calories: tdee,
      protein: Math.round(calcWeight * 2),
      fat: Math.round(calcWeight * 1),
      carbs: Math.max(0, Math.round((tdee - (calcWeight * 2 * 4) - (calcWeight * 1 * 9)) / 4)),
      fiber: Math.round((tdee / 1000) * 14)
    }
    setCustomMacros(nextMacros)
    localStorage.setItem('customMacros', JSON.stringify(nextMacros))
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await apiFetch<ApiUser>('/me')
        if (!cancelled) setCurrentUser(me)
      } catch {
        try {
          await apiFetch<{ ok: boolean }>('/auth/refresh', { method: 'POST' })
          const me = await apiFetch<ApiUser>('/me')
          if (!cancelled) setCurrentUser(me)
        } catch {
          // not logged in
        }
      } finally {
        // no-op
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const days = useMemo(() => daysInMonth(activeMonth), [activeMonth])

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
    const meal: Meal = {
      id: uid('meal'),
      name: `Meal ${n}`,
      products: [],
      isSearching: false,
      searchQuery: '',
      isRenaming: false,
      renameDraft: '',
    }
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
    const initial = currentMeals.find((m) => m.id === mealId)?.searchQuery ?? ''
    scheduleSearch(mealId, initial)
  }

  function beginRename(mealId: string) {
    setMeals(
      currentMeals.map((m) =>
        m.id === mealId ? { ...m, isRenaming: true, renameDraft: m.name } : { ...m, isRenaming: false },
      ),
    )
  }

  function setRenameDraft(mealId: string, value: string) {
    setMeals(currentMeals.map((m) => (m.id === mealId ? { ...m, renameDraft: value } : m)))
  }

  function commitRename(mealId: string) {
    setMeals(
      currentMeals.map((m) => {
        if (m.id !== mealId) return m
        const nextName = (m.renameDraft ?? '').trim()
        return { ...m, name: nextName.length ? nextName : m.name, isRenaming: false }
      }),
    )
  }

  function cancelRename(mealId: string) {
    setMeals(currentMeals.map((m) => (m.id === mealId ? { ...m, isRenaming: false } : m)))
  }

  function closeSearch(mealId: string) {
    setMeals(currentMeals.map((m) => (m.id === mealId ? { ...m, isSearching: false } : m)))
  }

  function setSearchQuery(mealId: string, q: string) {
    setMeals(currentMeals.map((m) => (m.id === mealId ? { ...m, searchQuery: q } : m)))
    scheduleSearch(mealId, q)
  }

  function initiateAddProduct(mealId: string, item: Omit<Product, 'id'>) {
    if (!currentUser) {
      openAuth('login')
      return
    }
    setPendingAdd({ mealId, item, defaultWeight: '100' })
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

  function beginPointerReorder(e: React.PointerEvent, mealId: string) {
    // Mobile Safari doesn't support HTML5 drag well; use pointer-based reorder.
    e.preventDefault()
    dragMealIdRef.current = mealId
    setDragMealId(mealId)
    setDropTarget(null)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function updatePointerReorder(e: React.PointerEvent) {
    const from = dragMealIdRef.current
    if (!from) return
    const els = document.elementsFromPoint(e.clientX, e.clientY) as HTMLElement[]
    const mealEl = els.find((el) => el.dataset && 'mealId' in el.dataset) as HTMLElement | undefined
    const targetId = mealEl?.dataset.mealId
    if (!targetId || targetId === from) {
      setDropTarget(null)
      return
    }
    const rect = mealEl.getBoundingClientRect()
    const y = e.clientY - rect.top
    const position: 'before' | 'after' = y < rect.height / 2 ? 'before' : 'after'
    setDropTarget({ mealId: targetId, position })
  }

  function endPointerReorder() {
    const from = dragMealIdRef.current
    dragMealIdRef.current = null
    if (from && dropTarget) reorderMealsAt(from, dropTarget.mealId, dropTarget.position)
    setDragMealId(null)
    setDropTarget(null)
  }

  function openAuth(mode: 'login' | 'signup') {
    setAuthMode(mode)
    setAuthError(null)
    setAuthEmail('')
    setAuthPassword('')
    setAuthDisplayName('')
    setAuthRememberMe(true)
    setIsAuthOpen(true)
  }

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    } finally {
      setCurrentUser(null)
    }
  }

  async function submitAuth() {
    setAuthError(null)
    const email = authEmail.trim().toLowerCase()
    const password = authPassword
    const displayName = authDisplayName.trim()

    try {
      if (authMode === 'signup') {
        const me = await apiFetch<ApiUser>('/auth/signup', {
          method: 'POST',
          body: { email, password, displayName, rememberMe: authRememberMe },
        })
        setCurrentUser(me)
        setIsAuthOpen(false)
        return
      }

      const me = await apiFetch<ApiUser>('/auth/login', {
        method: 'POST',
        body: { email, password, rememberMe: authRememberMe },
      })
      setCurrentUser(me)
      setIsAuthOpen(false)
    } catch (e) {
      const msg = typeof e === 'object' && e && 'message' in e ? String((e as any).message) : 'Login failed'
      setAuthError(msg)
    }
  }

  function runSearch(mealId: string, q: string) {
    const trimmed = q.trim()
    if (!trimmed) {
      setProductSearch((prev) => ({
        ...prev,
        [mealId]: { items: [], isLoading: false, error: null },
      }))
      return
    }

    setProductSearch((prev) => ({
      ...prev,
      [mealId]: { items: prev[mealId]?.items ?? [], isLoading: true, error: null },
    }))
    void (async () => {
      try {
        const res = await apiFetch<{ items: Array<{ name: string; macros: Record<MacroKey, number> }> }>(
          `/products/search?query=${encodeURIComponent(trimmed)}&page=1&pageSize=10`,
        )
        const items = (res.items ?? []).map((it) => ({ name: it.name, macros: it.macros }))
        setProductSearch((prev) => ({ ...prev, [mealId]: { items, isLoading: false, error: null } }))
      } catch (e) {
        const msg = typeof e === 'object' && e && 'message' in e ? String((e as any).message) : 'Search failed'
        setProductSearch((prev) => ({ ...prev, [mealId]: { items: [], isLoading: false, error: msg } }))
      }
    })()
  }

  function scheduleSearch(mealId: string, q: string) {
    const existing = searchTimersRef.current[mealId]
    if (existing) window.clearTimeout(existing)
    searchTimersRef.current[mealId] = window.setTimeout(() => runSearch(mealId, q), 750)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" aria-label="countIT">
          <img className="brandLogo" src={`${import.meta.env.BASE_URL}countIT.svg`} alt="countIT" />
        </div>
        <div className="topbarMeta">
          <button className="ghostButton mobileOnly" type="button" onClick={() => setIsDaysOpenMobile((v) => !v)}>
            Days
          </button>
          <div className="topbarDay">{selectedDayKey === todayKey ? 'Today' : formatDayLabel(selectedDayKey)}</div>
          {currentUser ? (
            <div className="userChip">
              <span className="userChipName">{currentUser.displayName}</span>
              <button className="userChipLogout" type="button" onClick={() => setIsSettingsOpen(true)} title="Settings">
                <span className="desktopOnly">Settings</span>
                <span className="mobileOnly">⚙️</span>
              </button>
              <button className="userChipLogout" type="button" onClick={logout} title="Logout">
                <span className="desktopOnly">Logout</span>
                <span className="mobileOnly">🚪</span>
              </button>
            </div>
          ) : (
            <>
              <div className="authButtons desktopOnly">
                <button className="ghostButton" type="button" onClick={() => openAuth('login')}>
                  Log in
                </button>
                <button className="ghostButton" type="button" onClick={() => openAuth('signup')}>
                  Sign up
                </button>
              </div>
              <button className="ghostButton mobileAuthButton" type="button" onClick={() => openAuth('login')}>
                Account
              </button>
            </>
          )}
        </div>
      </header>

      <aside className={`left ${isDaysOpenMobile ? 'openMobile' : ''}`}>
        <div className="daysHeader">
          <div>
            <div className="panelTitle">Days</div>
            <div className="monthTitle">{monthLabel(activeMonth)}</div>
          </div>
          <button
            className="ghostButton"
            type="button"
            onClick={() => {
              setActiveMonth(monthKey(todayKey))
              ensureDay(todayKey)
              setSelectedDayKey(todayKey)
              setIsDaysOpenMobile(false)
            }}
            title="Go to today"
          >
            Today
          </button>
        </div>

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
                  setActiveMonth(monthKey(key))
                  setIsDaysOpenMobile(false)
                }}
                role="option"
                aria-selected={isActive}
              >
                <span className="dayLabel">{label}</span>
                <span className="dayMini" aria-hidden="true">
                  {key === todayKey ? (
                    <>
                      <span className="dayMiniWeek">Today</span>
                      <span className="dayMiniDate">
                        {dayOfMonth(key)} {monthShort(key)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="dayMiniWeek">{weekdayShort(key).slice(0, 2)}</span>
                      <span className="dayMiniDate">
                        {dayOfMonth(key)} {monthShort(key)}
                      </span>
                    </>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className="daysFooter">
          <button className="ghostButton" type="button" onClick={() => setActiveMonth((m) => addMonths(m, -1))}>
            ← Prev
          </button>
          <button className="ghostButton" type="button" onClick={() => setActiveMonth((m) => addMonths(m, 1))}>
            Next →
          </button>
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
            const searchState = productSearch[meal.id] ?? { items: [], isLoading: false, error: null }
            const filtered = searchState.items

            const mealTotals = sumMacros(meal.products)

            return (
              <section
                key={meal.id}
                className={`mealCard ${dragMealId === meal.id ? 'dragging' : ''}`}
                data-meal-id={meal.id}
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
                onPointerMove={updatePointerReorder}
                onPointerUp={endPointerReorder}
                onPointerCancel={endPointerReorder}
              >
                {dropTarget?.mealId === meal.id ? (
                  <div className={`dropIndicator ${dropTarget.position}`} aria-hidden="true" />
                ) : null}
                <div className="mealHeader">
                  <div className="mealTitle">
                    <button
                      className="dragHandle"
                      type="button"
                      title="Drag to reorder"
                      aria-label="Reorder meal"
                      onPointerDown={(e) => beginPointerReorder(e, meal.id)}
                    >
                      ⋮⋮
                    </button>
                    {meal.isRenaming ? (
                      <input
                        className="mealNameInput"
                        value={meal.renameDraft ?? ''}
                        onChange={(e) => setRenameDraft(meal.id, e.target.value)}
                        onBlur={() => commitRename(meal.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(meal.id)
                          if (e.key === 'Escape') cancelRename(meal.id)
                        }}
                        autoFocus
                        aria-label="Meal name"
                      />
                    ) : (
                      <button className="mealNameButton" type="button" onClick={() => beginRename(meal.id)} title="Rename meal">
                        {meal.name}
                      </button>
                    )}
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
                      {searchState.isLoading ? <div className="emptyHint">Searching…</div> : null}
                      {!searchState.isLoading && searchState.error ? (
                        <div className="emptyHint">{searchState.error}</div>
                      ) : null}
                      {!searchState.isLoading && !searchState.error && filtered.length === 0 ? (
                        <div className="emptyHint">No matches.</div>
                      ) : null}
                      {!searchState.isLoading && !searchState.error
                        ? filtered.map((item) => (
                            <button
                              key={item.name}
                              className="resultItem"
                              type="button"
                              onClick={() => initiateAddProduct(meal.id, item)}
                            >
                              <div className="resultName">{item.name}</div>
                              <div className="resultMacros">
                                {item.macros.calories} kcal · P {item.macros.protein}g · C {item.macros.carbs}g · F{' '}
                                {item.macros.fat}g · Fi {item.macros.fiber}g
                              </div>
                            </button>
                          ))
                        : null}
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
            const goal = customMacros[k]
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

      <div className="mobileMacroDock" aria-label="Macros (mobile)">
        <div className="mobileMacroDockInner">
          {(Object.keys(MACRO_LABELS) as MacroKey[]).map((k) => {
            const value = dayTotals[k]
            const goal = customMacros[k]
            const pct = goal > 0 ? clamp(value / goal, 0, 1) : 0
            const short =
              k === 'calories'
                ? 'Kcal'
                : k === 'protein'
                  ? 'P'
                  : k === 'carbs'
                    ? 'C'
                    : k === 'fat'
                      ? 'F'
                      : 'Fi'
            return (
              <div key={k} className="mobileMacroItem">
                <div className="mobileMacroTop">
                  <span className="mobileMacroKey">{short}</span>
                  <span className="mobileMacroVal">{value}</span>
                </div>
                <div className="mobileMacroBar" aria-hidden="true">
                  <div className="mobileMacroFill" style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

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

              <label className="field" style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <input type="checkbox" checked={authRememberMe} onChange={(e) => setAuthRememberMe(e.target.checked)} />
                <span className="fieldLabel" style={{ margin: 0 }}>
                  Stay logged in
                </span>
              </label>

              {authError ? <div className="formError">{authError}</div> : null}

              <button className="primaryButton" type="button" onClick={submitAuth}>
                {authMode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!warningAccepted ? (
        <div className="modalOverlay" style={{ zIndex: 9999 }}>
          <div className="modalCard">
            <div className="modalHeader">
              <div className="modalTitle">⚠️ Important Notice</div>
            </div>
            <div className="modalBody" style={{ padding: '20px', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '15px' }}>Welcome to countIT!</p>
              <p style={{ marginBottom: '15px' }}>
                Please note that due to the use of a free database tier, this application and all user data will be <strong>permanently deleted on May 25th, 2026</strong>.
              </p>
              <p style={{ marginBottom: '25px' }}>After that date, all accounts and tracked meals will be gone.</p>
              <button className="primaryButton" type="button" onClick={() => {
                localStorage.setItem('warningAccepted', 'true')
                setWarningAccepted(true)
              }}>
                I Understand
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingAdd ? (
        <div className="modalOverlay" role="dialog" onMouseDown={(e) => { if (e.target === e.currentTarget) setPendingAdd(null) }}>
          <div className="modalCard" style={{ maxWidth: '400px' }}>
            <div className="modalHeader">
              <div className="modalTitle">Add {pendingAdd.item.name}</div>
              <button className="iconButton danger" type="button" onClick={() => setPendingAdd(null)} title="Close">
                ×
              </button>
            </div>
            <div className="modalBody" style={{ padding: '20px' }}>
              <label className="field">
                <span className="fieldLabel">Weight (grams)</span>
                <input
                  className="searchInput"
                  type="number"
                  value={pendingAdd.defaultWeight}
                  onChange={(e) => setPendingAdd({ ...pendingAdd, defaultWeight: e.target.value })}
                  autoFocus
                />
              </label>
              <div style={{ marginTop: '20px' }}>
                <button className="primaryButton" type="button" onClick={() => {
                  const w = parseFloat(pendingAdd.defaultWeight) || 100
                  const factor = w / 100
                  const scaledMacros = {
                    calories: Math.round(pendingAdd.item.macros.calories * factor * 10) / 10,
                    protein: Math.round(pendingAdd.item.macros.protein * factor * 10) / 10,
                    carbs: Math.round(pendingAdd.item.macros.carbs * factor * 10) / 10,
                    fat: Math.round(pendingAdd.item.macros.fat * factor * 10) / 10,
                    fiber: Math.round(pendingAdd.item.macros.fiber * factor * 10) / 10,
                  }
                  const product: Product = { id: uid('prod'), name: `${pendingAdd.item.name} (${w}g)`, macros: scaledMacros }
                  setMeals(
                    currentMeals.map((m) =>
                      m.id === pendingAdd.mealId ? { ...m, products: [...m.products, product], isSearching: false, searchQuery: '' } : m,
                    ),
                  )
                  setPendingAdd(null)
                }}>
                  Confirm & Add
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isSettingsOpen ? (
        <div className="modalOverlay" role="dialog" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsSettingsOpen(false) }}>
          <div className="modalCard" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modalHeader">
              <div className="modalTitle">Settings</div>
              <button className="iconButton danger" type="button" onClick={() => setIsSettingsOpen(false)} title="Close">
                ×
              </button>
            </div>
            <div className="modalBody" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              <div>
                <h2>Custom Macros</h2>
                <div className="settingsGrid">
                  {(Object.keys(MACRO_LABELS) as MacroKey[]).map(k => (
                    <label key={k} className="field">
                      <span className="fieldLabel">{MACRO_LABELS[k]}</span>
                      <input
                        className="searchInput"
                        type="number"
                        value={customMacros[k]}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0
                          const next = { ...customMacros, [k]: val }
                          setCustomMacros(next)
                          localStorage.setItem('customMacros', JSON.stringify(next))
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <h2>Calculate from Body Metrics</h2>
                <div className="settingsGrid">
                  <label className="field">
                    <span className="fieldLabel">Sex</span>
                    <select className="searchInput" value={calcSex} onChange={e => setCalcSex(e.target.value as 'male'|'female')}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Activity Level</span>
                    <select className="searchInput" value={calcActivity} onChange={e => setCalcActivity(parseFloat(e.target.value))}>
                      <option value="1.2">Sedentary (office job)</option>
                      <option value="1.375">Light Exercise (1-2 days/week)</option>
                      <option value="1.55">Moderate Exercise (3-5 days/week)</option>
                      <option value="1.725">Heavy Exercise (6-7 days/week)</option>
                      <option value="1.9">Athlete (2x per day)</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Age (years)</span>
                    <input className="searchInput" type="number" value={calcAge} onChange={e => setCalcAge(parseFloat(e.target.value)||0)} />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Weight (kg)</span>
                    <input className="searchInput" type="number" value={calcWeight} onChange={e => setCalcWeight(parseFloat(e.target.value)||0)} />
                  </label>
                  <label className="field" style={{ gridColumn: '1 / -1' }}>
                    <span className="fieldLabel">Height (cm)</span>
                    <input className="searchInput" type="number" value={calcHeight} onChange={e => setCalcHeight(parseFloat(e.target.value)||0)} />
                  </label>
                </div>
                <button className="primaryButton" style={{ marginTop: '20px' }} type="button" onClick={applyCalculatedMacros}>
                  Generate Macros
                </button>
              </div>

            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
