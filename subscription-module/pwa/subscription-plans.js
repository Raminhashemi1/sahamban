const PLANS = Object.freeze([
  { id: 'SAHAMBAN_PRO_30D', days: 30, label: 'یک ماهه', price: 1500000 },
  { id: 'SAHAMBAN_PRO_60D', days: 60, label: 'دو ماهه', price: 2850000 },
  { id: 'SAHAMBAN_PRO_90D', days: 90, label: 'سه ماهه', price: 4050000 },
  { id: 'SAHAMBAN_PRO_180D', days: 180, label: 'شش ماهه', price: 7650000 },
  { id: 'SAHAMBAN_PRO_365D', days: 365, label: 'یک ساله', price: 14600000 }
]);

const numberFa = new Intl.NumberFormat('fa-IR');

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Mounts the standalone five-plan subscription UI.
 * The native bridge facade must expose:
 *   getAvailability(): Promise<{available:boolean, store:'BAZAAR'|'MYKET'}>
 *   getEntitlement(): Promise<{active:boolean, expiresAt:string|null}>
 *   purchase(planId): Promise<{status:string}>
 * It must not report success before server verification and settlement.
 */
export async function mountSubscriptionPlans(root, billing = window.SahminoBilling) {
  if (!(root instanceof HTMLElement)) throw new TypeError('SUBSCRIPTION_ROOT_REQUIRED');
  if (!billing || typeof billing.getAvailability !== 'function' ||
      typeof billing.getEntitlement !== 'function' || typeof billing.purchase !== 'function') {
    throw new TypeError('NATIVE_BILLING_BRIDGE_UNAVAILABLE');
  }

  root.replaceChildren();
  const section = element('section', 'sahmino-subscriptions');
  section.dir = 'rtl';
  const heading = element('h2', 'sahmino-subscriptions__heading', 'انتخاب اشتراک سهمینو');
  const status = element('p', 'sahmino-subscriptions__status', 'در حال بررسی وضعیت اشتراک…');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const list = element('div', 'sahmino-subscriptions__plans');
  section.append(heading, status, list);
  root.append(section);

  let busy = false;
  const setBusy = (value) => {
    busy = value;
    for (const button of list.querySelectorAll('button')) button.disabled = value;
  };

  for (const plan of PLANS) {
    const card = element('article', 'sahmino-plan');
    const name = element('h3', 'sahmino-plan__name', plan.label);
    const duration = element('p', 'sahmino-plan__duration', `${numberFa.format(plan.days)} روز`);
    const price = element('p', 'sahmino-plan__price', `${numberFa.format(plan.price)} ریال`);
    const button = element('button', 'sahmino-plan__buy', 'خرید اشتراک');
    button.type = 'button';
    button.addEventListener('click', async () => {
      if (busy) return;
      setBusy(true);
      status.textContent = 'در حال اتصال به فروشگاه و ثبت سفارش…';
      try {
        const result = await billing.purchase(plan.id);
        const state = result?.status;
        if (state === 'PURCHASED_AND_SETTLED' || state === 'PAID') {
          status.textContent = 'پرداخت تأیید شد؛ در حال دریافت اعتبار اشتراک…';
          const entitlement = await billing.getEntitlement();
          status.textContent = entitlement?.active
            ? `اشتراک شما فعال است. تاریخ انقضا: ${new Date(entitlement.expiresAt).toLocaleDateString('fa-IR')}`
            : 'پرداخت ثبت شد؛ وضعیت اشتراک در حال به‌روزرسانی است.';
        } else if (state === 'CANCELLED') {
          status.textContent = 'خرید توسط شما لغو شد.';
        } else if (state === 'PENDING_VERIFICATION') {
          status.textContent = 'رسید خرید برای تأیید ارسال شد. تا تأیید نهایی، اشتراک فعال نمی‌شود.';
        } else {
          status.textContent = 'خرید انجام نشد. لطفاً دوباره تلاش کنید.';
        }
      } catch {
        status.textContent = 'ارتباط با فروشگاه یا سرور برقرار نشد. وضعیت خرید را دوباره بررسی کنید.';
      } finally {
        setBusy(false);
      }
    });
    card.append(name, duration, price, button);
    list.append(card);
  }

  try {
    const [availability, entitlement] = await Promise.all([
      billing.getAvailability(),
      billing.getEntitlement()
    ]);
    if (!availability?.available) {
      status.textContent = 'پرداخت در این نسخه از برنامه در دسترس نیست.';
      setBusy(true);
    } else if (entitlement?.active) {
      status.textContent = `اشتراک فعال تا ${new Date(entitlement.expiresAt).toLocaleDateString('fa-IR')}`;
    } else {
      status.textContent = 'اشتراک فعالی ندارید. یکی از طرح‌ها را انتخاب کنید.';
    }
  } catch {
    status.textContent = 'برای نمایش وضعیت اشتراک، اتصال به سرور لازم است.';
  }

  return {
    destroy() { root.replaceChildren(); },
    plans: PLANS.map((plan) => ({ ...plan }))
  };
}
