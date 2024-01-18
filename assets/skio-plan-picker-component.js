/*
Usage Notes: 

The following web component can be dropped into any standard Shopify theme (i.e. non-headless), using Liquid to pass product data:

  {% assign skioSellingPlanGroups = product.selling_plan_groups | where: 'app_id', 'SKIO' %}
  {% if skioSellingPlanGroups.size > 0 %}
    <skio-plan-picker 
      product='{{ product | json | escape }}'
      selectedVariant='{{ product.selected_or_first_available_variant | json | escape }}'
      formId='{{ product_form_id }}'
      currency='{{ cart.currency.iso_code }}'
      >
    </skio-plan-picker>
    <input type="hidden" aria-hidden="true" name="selling_plan" value="">
    <script src="{{ 'skio-plan-picker-component.js' | asset_url }}" type="module"></script>
  {% endif %}

  Note: formId not required if element is inside of a form already

  Example variantChanged event dispatch:
  document.dispatchEvent( new CustomEvent("variantChanged", { detail: { variantId: variant.id } }) );
*/

import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

const skioStyles = css`
  :host {
    display: block;
    margin: 3rem 0;
    
    --font: "FF Clan OT Bold";
    --font-secondary: "Gotham-Medium";
    --text: #3A3737;
    --text-secondary: #FFF;
    --primary: #EA5711;
    --secondary: #00AA9B;
  }
  .skio-plan-picker {
    color: var(--text);
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 0;
    border: 0;
    max-width: 520px;
  }
  .skio-onetime-second {
    order: 2;
  }
  
  .skio-group-container {
    display: none;
  }
  .skio-group-container--available {
    display: block;
    position: relative;
    border-radius: 15.262px;
    border-width: 2;
    border-color: currentColor;
    border-style: solid; 
    transition: border-color 0.2s ease, opacity 0.1s ease;
    font-weight: 700;
    font-family: var(--font);
    opacity: 0.75;
    background: var(--text-secondary);
  }
  .skio-group-container--selected {
    color: var(--primary);
    border-color: currentColor;
    opacity: 1;
  }
  
  .skio-group-input {
    position: absolute;
    width: 0px;
    height: 0px;
    opacity: 0;
  }
  .skio-group-input:focus-visible ~ .skio-group-label {
    outline: 2px #ccc solid;
    outline-offset: 4px;
    border-radius: 5px;
  }
  
  .skio-group-label {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    padding: 10px;
    overflow: hidden;
  }
  
  .skio-group-topline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    width: 100%;
    font-size: 16px;
  }
  
  .skio-radio__container {
    display: flex;
    margin-right: 10px;
  }
  
  .skio-radio {
    transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), opacity 0.25s cubic-bezier(0.4,0,0.2,1);
    transform-origin: center;
    transform: scale(0);
    opacity: 0;
  }
  .skio-group-label:hover .skio-radio {
    transform: scale(1);
    opacity: 0.75;
  }
  .skio-group-container--selected .skio-group-label .skio-radio {
    transform: scale(1);
    opacity: 1;
  }
  
  .skio-price {
    padding: 4px 12px;
    background: var(--primary);
    color: var(--text-secondary);
    border-radius: 20px;
    margin-left: auto;
  }
  
  .skio-group-content {
    width: auto;
    margin-left: 30px;
    transition: max-height 0.25s cubic-bezier(0.4,0,0.2,1),
                opacity 0.25s cubic-bezier(0.4,0,0.2,1);
    max-height: 38px;
    opacity: 1;
  }
  
  /* Hide frequency if not selected */
  .skio-group-container:not(.skio-group-container--selected) .skio-group-content {
    max-height: 0;
    opacity: 0;
    pointer-events: none;
  }
  
  .skio-group-title {
    min-width: max-content;
  }
  
  .skio-save {
    color: var(--text-secondary);
    border: 1px var(--secondary) solid;
    background: var(--secondary);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
  }
  
  .skio-frequency {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 8px 30px 8px 10px;
    margin-top: 5px;
    border-radius: 5px;
    background-color: #f7f7f7;
    width: 100%;
    border: 0;
    font-size: 14px;
    font-family: inherit;
    white-space: nowrap;
    text-overflow: ellipsis;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' class='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7' /%3E%3C/svg%3E");
    background-position: right 10px top 50%;
    background-size: 18px;
    background-repeat: no-repeat;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
  }
  .skio-frequency.skio-frequency--one {
    background-image: none;
    pointer-events: none;
  }
  
  .skio-frequency span {
    text-transform: lowercase;
  }

  button.add-to-cart {
    justify-content: center;
    font-weight: 400;
    text-transform: capitalize;
    letter-spacing: 0;
    font-style: normal;
    font-size: 16px;
    text-decoration: none;
    box-shadow: 0 0 #0000004d inset;
    width: 100%;
    color: #fff;
    background-color: #000;
    border-radius: 5px;
    transition-duration: .3s;
    padding: 10px 32px;
    text-transform: uppercase;
    cursor: pointer;
    font-family: 'FK Grotesk Neue Trial';
    transition: border-color 0.25s ease, background-color 0.25s ease, color 0.25s ease;

    border: solid 2px rgba(0,0,0,0);
  }
  button.add-to-cart:hover {
    background-color: rgba(0,0,0,0);
    color: #000;
    border-color: #000;
  }

  .skio-details {
    --text-color: #333;
    --text-color-secondary: #888; 
    
    user-select: none;
    -webkit-user-select: none;
    margin-bottom: 20px;
    order: 3;
  }

  .skio-details summary::-webkit-details-marker,
  .skio-details summary::marker,
  .skio-details slot {
    color: rgba(0,0,0,0) !important;
  }

  .skio-details summary {
    display: flex;
  }

  .skio-details summary span {
    font-size: 0.9em;
    display: flex;
    padding: .5em 0;
    cursor: pointer;
    align-items: center;
    gap: 10px;
    text-decoration: underline;
    color: #000;
  }

  @keyframes fadeInDown {
    0% {
      opacity: 0;
      transform: translateY(-15px);
    }
    100% {
      opacity: 1;
      transform: translateY(0px);
    }
  }
  .skio-details[open] > .skio-details--content {
    animation-name: fadeInDown;
    animation-duration: 0.3s;
  }

  .skio-details--content {
    position: absolute;
    z-index: 1020;
    padding: 1em;
    width: fit-content;
    border-radius: 5px;
    background: white;
    box-shadow: 0 0 5px rgb(23 24 24 / 5%), 0 1px 2px rgb(0 0 0 / 7%);
  }

  .skio-details ul {
    margin: 0;
    padding: 0;
  }

  .skio-details ul li {
    display: flex;
    align-items: flex-start;
    gap: .75em;

    margin-bottom: 1em;
  }

  .skio-details .skio-content {
    display: flex;
    flex-direction: column;
  }

  .skio-details .skio-content p {
    font-size: 0.9em;

    margin-top: 0;
    margin-bottom: 0;

    letter-spacing: 0;
    line-height: 1.5;

    color: var(--text-color);
  }

  .skio-details ul li small {
    font-size: 0.7em;
    color: var(--text-color-secondary);
  }

  .skio-details .skio-icon {
    display: flex;

    width: 2.25em;
    height: 2.25em;

    color: var(--text-color);
    background: #f8f8f8;
    border-radius: 100%;

    flex-shrink: 0;
    align-items: center;
    justify-content: center;
  }

  .skio-details .skio-icon svg {
    width: 1.25em;
    height: 1.25em;

    color: inherit;
  }

  .skio-details--footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.9em;
  }

  .skio-details--footer a {
    color: var(--text-color);
  }

  .skio-manage-link {
    text-decoration: underline;
  }

  .powered-by-skio {
    font-size: 0.8em;

    display: flex;
    text-decoration: none;
    
    align-items: center;
    gap: 3px;
  }
  
  .skio-label {
    font-size: 22px;
    font-family: var(--font-secondary);
    margin-bottom: 1rem;
  }
@media only screen and (max-width: 600px) {
   .skio-price{margin-top: 7px!important;}
  .skio-save{    margin-left: 2.2rem!important;}
  .product__info-wrapper   .skio-save{    margin-left: 0rem!important;}
   .product__info-wrapper .skio-group-topline{font-size:14px;}
    .skio-group-content{    position: absolute;
    bottom: 6px;
}
.skio-frequency{       padding: 8px 4px;
    font-size: 10px;}
      }
`;

export class SkioPlanPickerComponent extends LitElement {
  static properties = {
    product: { type: Object },            //required
    productHandle: { type: String },      //optional (unless product isn't passed, then required)
    key: { type: String },                //optional, defaults to product.id; identifier for this instance of the Skio plan picker
    
    formId: { type: String },             //optional; if passed, used to connect input fields to form
    needsFormId: { type: Boolean },       //optional, defaults to false; if true, element needs to be passed a formId, else it searches for a form

    subscriptionFirst: { type: Boolean }, //optional, defaults to false; if true, shows subscription option above onetime
    startSubscription: { type: Boolean }, //optional, defaults to false; if true, auto-selects subscription on page load
    discountFormat: { type: String },     //optional, defaults to percent; can also pass "fixed"
    
    currency: { type: String },           //optional, defaults to 'USD', but can pass any 3 char identifier
    language: { type: String },           //optional, defaults to 'en-US', but can pass any similarly formatted language identifier
    moneyFormatter: {},                   //placeholder for object

    externalPriceSelector: { type: String },      //optional, used to update the external price

    externalPriceSelectorWithCurrency: { type: String },      //optional, used to update the external price
  
    selectedVariant: { type: Object },    //placeholder for data
    skioSellingPlanGroups: {},            //placeholder for data
    availableSellingPlanGroups: {},       //placeholder for data
    selectedSellingPlanGroup: {},         //placeholder for data
    selectedSellingPlan: {},              //placeholder for data

    defaultFrequency: {},                 //placeholder for data

    showAddToCartButton: { type: Boolean },

    meta: {},

    useVariantInputClickEvents: {type: Boolean}, // optional, allows use of variant input click events to update skio's selectedVariant
    variantInputSelector: {}
  };

  static styles = skioStyles;

  constructor() {
    super();
    this.product = null;
    this.selectedVariant = null;

    this.productHandle = null;

    this.purchaseOption = 'onetime';

    this.key = null;
    this.formId = null;
    this.needsFormId = false;

    this.skioSellingPlanGroups = [];
    this.availableSellingPlanGroups = [];

    this.selectedSellingPlanGroup = null;
    this.selectedSellingPlan = null;

    this.startSubscription = false;
    this.subscriptionFirst = false;

    this.skioMainProduct = true;

    this.discountFormat = 'percent';

    this.externalPriceSelector = '[skio-external-price]';

    this.externalPriceSelectorWithCurrency = '[skio-external-price-with-currency]';

    this.currency = Shopify.currency.active;
    this.language = 'en-US';
    this.moneyFormatter = new Intl.NumberFormat(this.language, {
      style: 'currency',
      currency: this.currency,
    });

    this.defaultFrequency = null;

    this.showAddToCartButton = false;

    this.meta = '';

    this.lastSellingPlanName = '';

    this.showDetailsHover = false;

    this.useVariantInputClickEvents = null;
    this.variantInputSelector = null;

  }

  connectedCallback() {
    super.connectedCallback();

    if (this.startSubscription == true) {
      this.purchaseOption = 'subscription';
    }

    if(!this.product && this.productHandle) {
      this.fetchProduct(this.productHandle);
    }

    if (this.needsFormId && this.formId == null) {
      let forms = document.querySelectorAll('form[action="/cart/add"]');
      if (forms.length > 0) {
        let form;
        forms.forEach((el) => {
          if (el.hasAttribute('skio-key')) {
            if (el.getAttribute('skio-key') == this.key) form = el;
          }
        });
        if (!form) form = forms[0];
        this.formId = form.id;
        this.requestUpdate();
      }
    }
    let skio = this;
    const $form = this.querySelector('#' + this.formId) || this.closest('form[action*="/cart/add"]');
    $form.querySelector('[name="id"]').addEventListener('change', function(){
      const variantId = this.value;
      let variant = skio.product.variants.find(v => v.id.toString() === variantId.toString());
      skio.selectedVariant = variant;
    })
    
    document.addEventListener("variantChanged", function(e) {
      //update variant id
      let variantId = e.detail.variantId;
      let variant = skio.product.variants.find(x => x.id == variantId);
      if (variant) skio.selectedVariant = variant;
      else skio.log("Unable to find variant with id: ", variantId);
      skio.requestUpdate();
    });

    this.moneyFormatter = new Intl.NumberFormat(this.language, {
      style: 'currency',
      currency: skio.currency,
    });

    if (this.meta !== '') this.meta = JSON.parse(this.meta);

    if (this.useVariantInputClickEvents) {
      document.addEventListener('load', skio.addVariantClickEventListeners)
    }

  }

  render() {
    if(!this.product || !this.selectedVariant || this.skioSellingPlanGroups.length == 0 || !this.product?.available) return;
    
    return html`
      <fieldset class="skio-plan-picker" skio-plan-picker="${ this.key }">
        <input ${ this.formId !== null ? html`form="${ this.formId }"` : '' } name="selling_plan" type="hidden" value="${ this.selectedSellingPlan !== null ? this.selectedSellingPlan?.id : ''}" />
        <input ${ this.for!== null ? html`form="${ this.formId }"` : '' } name="properties[Discount]" type="hidden" value="${ this.selectedSellingPlan !== null ? this.discount(this.selectedSellingPlan).percent : '' }" 
          ?disabled="${ this.selectedSellingPlan == null ? true : false }" />
        
        <label class="skio-label">
          Select purchase option:
        </label>  
         
        <div class="skio-group-container ${ this.product.requires_selling_plan == false ? 'skio-group-container--available' : '' } ${ this.selectedSellingPlanGroup == null ? 'skio-group-container--selected' : '' } ${ this.subscriptionFirst ? 'skio-onetime-second' : ''}" skio-group-container 
          @click=${() => this.selectSellingPlanGroup(null) } >
        
          <input id="skio-one-time-${ this.key }" class="skio-group-input" name="skio-group-${ this.key }" type="radio" value="" 
            skio-one-time ?checked=${ this.startSubscription == false && this.product.requires_selling_plan == false ? true : false }>
          <label class="skio-group-label skioonetime" for="skio-one-time-${ this.key }">
            <div class="skio-group-topline">
              <div class="skio-radio__container">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
                  <circle class="skio-radio" cx="12" cy="12" r="7" fill="currentColor"></circle>
                </svg>
              </div>
              <div class="skio-group-title">
                One-time
              </div>
              <div class="skio-price">
                <span skio-onetime-price>${ this.moneyFormatter.format(this.selectedVariant.price / 100) }</span>
              </div>
            </div>
          </label>
        </div>
        ${ this.availableSellingPlanGroups ? this.availableSellingPlanGroups.map((group, index) => 
          html`
            <div class="skio-group-container skio-group-container--available ${ this.selectedSellingPlanGroup == group ? 'skio-group-container--selected' : '' }" skio-group-container
              @click=${() => this.selectSellingPlanGroup(group) }>
              <input id="skio-selling-plan-group-${ index }-${ this.key }" class="skio-group-input" name="skio-group-${ this.key }"
                type="radio" value="${ group.id }" skio-selling-plan-group="${ group.id }" ?checked=${ this.selectedSellingPlanGroup == group ? true : false } >
              <label class="skio-group-label skioplansell" for="skio-selling-plan-group-${ index }-${ this.key }">
                <div class="skio-group-topline">
                  <div class="skio-radio__container">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
                      <circle class="skio-radio" cx="12" cy="12" r="7" fill="currentColor"></circle>
                    </svg>
                  </div>
                  <div class="skio-group-title">
                  ${ group.name == 'Subscription' ? 'Subscribe & Save' : group.name }
                    ${ this.discount(group.selected_selling_plan).percent !== '0%' ? html`
                      <span class="skio-save">Save <span skio-discount>${ this.discountFormat == 'percent' ? this.discount(group.selected_selling_plan).percent : this.discount(group.selected_selling_plan).amount }</span></span>
                    ` : html`` }
                  </div>
                  <div class="skio-price">
                    ${ this.selectedVariant.price < this.selectedVariant.price - this.discount(group.selected_selling_plan).amount ? html`
                      <del>${ this.moneyFormatter.format(this.selectedVariant.price / 100) }<del>
                    ` : html`` }
                    <span skio-subscription-price>${ this.price(group.selected_selling_plan) }</span>
                  </div>
                </div>
                <div class="skio-group-content">
                  <select skio-selling-plans="${ group.id }" class="skio-frequency${ group.selling_plans.length == 1 ? ' skio-frequency--one' : '' }"
                    @change=${ (e) => this.selectSellingPlan(e.target, group) }>
                    ${ group ? group.selling_plans.map((selling_plan) => 
                      html`
                      <option value="${ selling_plan.id }" ?selected=${group.selected_selling_plan == selling_plan }>
                        ${ group.name == 'Subscription' ? `Delivery ${ selling_plan.name.toLowerCase() }` : `${ selling_plan.name }` }
                      </option>
                      `
                    ): ''}
                  </select>
                </div>
              </label>
            </div>
          `
        ): ''}

      ${ this.showAddToCartButton ? html`
        <button @click=${() => this.addToCart() } class="add-to-cart">Add to Cart</button>
      ` : html``}

      </fieldset>`
  }

  updated = (changed) => {
    if(changed.has('product') && this.product) {
      //update key
      this.key = this.key ? this.key : this.product.id;

      //update skioSellingPlanGroups
      this.skioSellingPlanGroups = this.product.selling_plan_groups.filter(
        selling_plan_group => selling_plan_group.app_id === 'SKIO'
      )

      this.skioSellingPlanGroups.forEach((group) => {
        group.selling_plans.sort(function(a,b){
          if (parseInt(a.name.replace(/\D/g, "")) < parseInt(b.name.replace(/\D/g, ""))) return -1;
          if (parseInt(a.name.replace(/\D/g, "")) > parseInt(b.name.replace(/\D/g, ""))) return 1;
          if (parseInt(a.name.replace(/\D/g, "")) == parseInt(b.name.replace(/\D/g, ""))) return 0;
        })
      });

    }

    if(changed.has('selectedVariant') && this.selectedVariant) {
      //update availableSellingPlanGroups based on skioSellingPlanGroups and selectedVariant.id
      let skioSellingPlanGroups = JSON.parse(JSON.stringify(this.skioSellingPlanGroups));
      this.availableSellingPlanGroups = skioSellingPlanGroups.filter(selling_plan_group =>
        selling_plan_group.selling_plans.some(selling_plan =>
          this.selectedVariant.selling_plan_allocations.some(
            selling_plan_allocation => selling_plan_allocation.selling_plan_id === selling_plan.id
          )
        )
      )

      //update selectedSellingPlan value
      if (this.availableSellingPlanGroups?.length > 0) {
        //update each group with a default selected_selling_plan

        this.availableSellingPlanGroups.forEach((group) => {
          group.selling_plans = group.selling_plans.filter(x => this.selectedVariant.selling_plan_allocations.find(y => y.selling_plan_id == x.id) );
        })

        this.availableSellingPlanGroups.forEach((group => {
          if (this.defaultFrequency) {
            let selling_plan = group.selling_plans.find(x => x.name.toLowerCase().includes(this.defaultFrequency.toLowerCase()));
            if (selling_plan) group.selected_selling_plan = selling_plan;
            else group.selected_selling_plan = group.selling_plans[0];
          } else {
            group.selected_selling_plan = group.selling_plans[0];
          }
       }));

        if (this.startSubscription == true || this.product.requires_selling_plan == true || this.purchaseOption == 'subscription') {
          //find a matching selling plan, or choose first available

          if (this.selectedSellingPlan == null || this.selectedSellingPlan == undefined) {
            this.selectSellingPlanGroup(this.availableSellingPlanGroups[0]);
          }

          let sellingPlanName = this.selectedSellingPlan?.name;

          let sellingPlanGroup = this.availableSellingPlanGroups.find(x => x.selling_plans.find(y => y.name == sellingPlanName));
          let sellingPlan = sellingPlanGroup?.selling_plans.find(y => y.name == sellingPlanName);
          if (sellingPlanName == sellingPlan.name) {
            this.selectedSellingPlanGroup = sellingPlanGroup;
            this.selectedSellingPlan = sellingPlan;
          } else {
          this.selectedSellingPlanGroup = this.availableSellingPlanGroups[0];
          this.selectedSellingPlan = this.availableSellingPlanGroups[0].selling_plans[0];
          }

        } else {
          this.selectedSellingPlan, this.selectedSellingPlanGroup = null
        }
      } else {
        this.selectedSellingPlan, this.selectedSellingPlanGroup = null
      }

      //update the form that was passed, if any
      this.updateForm();

    }

    if(changed.has('selectedSellingPlan')) {
      //update price of price elements if applicable
      document.querySelectorAll(`[skio-price][skio-key="${ this.key }"]`).forEach((el) => {
        el.innerHTML = this.price(this.selectedSellingPlan);
      });

      //update display of external content elements
      document.querySelectorAll(`[skio-onetime-content][skio-key="${ this.key }"]`).forEach((el) => {
        this.selectedSellingPlan !== null ? el.style.display = "none" : el.style.removeProperty('display');
      });

      document.querySelectorAll(`[skio-subscription-content][skio-key="${ this.key }"]`).forEach((el) => {
        this.selectedSellingPlan == null ? el.style.display = "none" : el.style.removeProperty('display');
      });

      //dispatch CustomEvent to tell that this specific plan picker was updated, and pass the selectedSellingPlan
      const event = new CustomEvent(`skio::update-selling-plan`, {
        bubbles: true, 
        composed: true, 
        detail: {
          product: this.product,
          sellingPlan: this.selectedSellingPlan,
          key: this.key
        }
      });

      this.dispatchEvent(event);

      //update the form that was passed, if any
      this.updateForm();
      this.updateExternalPrice();

      //update external selling_plan input value
      let sellingPlanInput = document.querySelector('input[name="selling_plan"]')
      this.selectedSellingPlan != null ? sellingPlanInput.value = this.selectedSellingPlan.id : sellingPlanInput.value = ''
         
    }

    if(changed.has('formId')) {
      //update the form that was passed, if any
      this.updateForm();
    }

  }

  log = (...args) => {
    args.unshift('%c[skio]', 'color: #8770f2;');
    console.log.apply(console, args);
  }

  error = (...args) =>  {
    args.unshift('%c [skio]', 'color: #ff0000');
    console.error.apply(console, args);
  }

  detailsMouseover() {
    let details = this.renderRoot.querySelector('.skio-details');
    let summary = this.renderRoot.querySelector('.skio-details summary');
    if (!details.hasAttribute('open') && this.showDetailsHover == false) {
      summary.click();
      this.showDetailsHover = true;
    }
  }

  detailsMouseleave() {
    let details = this.renderRoot.querySelector('.skio-details');
    let summary = this.renderRoot.querySelector('.skio-details summary');
    if (details.hasAttribute('open') && this.showDetailsHover == true) {
      summary.click();
      this.showDetailsHover = false;
    }
  }

  updatePriceElement() {
    let priceEl = document.querySelector(`[data-skio-price="${ this.product.id }"]`);
    if (priceEl) {
      //add formatted price here
      let high = 0;
      this.product.variants.forEach((variant) => {
        if (variant.price > high) high = variant.price;
      });
      let content = '';
      if (!this.selectedSellingPlan) {
        content = this.moneyFormatter.format(this.selectedVariant.price / 100).replaceAll('A', '');
      } else {
        content = `<del>${this.moneyFormatter.format(high / 100).replaceAll('A', '')}</del>${this.price(this.selectedSellingPlan).replaceAll('A', '')}`;
      }
      priceEl.innerHTML = content;
    }
  }

  getMetadata(field) {
    let meta = this.meta;
    if (meta !== {}){
      let fieldData = meta[field];
      if (fieldData) return fieldData;
      else return '';
    }
  }

  getVariantMetadata(variantId, field) {
    let meta = this.meta;
    if (meta !== {}){
      let variantData = meta[variantId];
      if (variantData) {
        let fieldData = variantData[field];
        if (fieldData) return fieldData;
        else return '';
      }
    }
  }

  updateExternalPrice() {
    document.querySelectorAll(this.externalPriceSelector).forEach((el) => {
      this.selectedSellingPlan ? el.innerHTML = this.price(this.selectedSellingPlan) : el.innerHTML = this.money( this.selectedVariant.price);
    })
    document.querySelectorAll(this.externalPriceSelectorWithCurrency).forEach((el) => {
      this.selectedSellingPlan ? el.innerHTML = this.price(this.selectedSellingPlan) + ' ' + this.currency : el.innerHTML = this.money( this.selectedVariant.price) + ' ' + this.currency;
    })
  }
  
  // Update selected selling plan group; called on click of skio-group-container element
  selectSellingPlanGroup(group) {
    this.selectedSellingPlanGroup = group;
    this.selectedSellingPlan = group?.selected_selling_plan;
    if (this.selectedSellingPlan) this.lastSellingPlanName = this.selectedSellingPlan.name;
    if (group) this.purchaseOption = 'subscription'
    else this.purchaseOption = 'onetime'

    //update the form that was passed, if any
    this.updateForm();
  }

  // Update selected selling plan; called on change of skio-frequency select element
  selectSellingPlan(element, group) {
    let selling_plan = group.selling_plans.find(x => x.id == element.value);
    if (selling_plan) {
      group.selected_selling_plan = selling_plan;
      this.selectedSellingPlanGroup = group;
      this.selectedSellingPlan = selling_plan;
      this.lastSellingPlanName = this.selectedSellingPlan.name;
    }
    else this.log("Error: couldn't find selling plan with id " + element.value + " for variant " + this.selectedVariant.id + " from product " + this.product.id + " : " + this.product.handle);
  }

  // Update selected selling plan; called on change of skio-frequency select element
  selectSellingPlanButton(plan, group) {
    let selling_plan = group.selling_plans.find(x => x.id == plan.id);
    if (selling_plan) {
      group.selected_selling_plan = selling_plan;
      this.selectedSellingPlanGroup = group;
      this.selectedSellingPlan = selling_plan;
      this.lastSellingPlanName = this.selectedSellingPlan.name;
    }
    else this.log("Error: couldn't find selling plan with id " + element.value + " for variant " + this.selectedVariant.id + " from product " + this.product.id + " : " + this.product.handle);
  }

  // Formats integer value into money value
  money(price) {
    return this.moneyFormatter.format(price / 100.0)
  }

  // Calculates discount based on selling_plan.price_adjustments, returns { percent, amount } of selling plan discount
  discount(selling_plan) {

    if (!selling_plan)
      return { percent: '0%', amount: 0 }

    if (selling_plan.name.includes('prepaid')) {

      let option = selling_plan.options[0]['value'];

      var numberPattern = /\d+/g;
      let result = parseInt(option.match( numberPattern ).join(''));

      const price_adjustment = selling_plan.price_adjustments[0]
      const discount = { percent: '0%', amount: 0 }
      const price = this.selectedVariant.price * result;
      
      switch (price_adjustment.value_type) {
        case 'percentage':
          discount.percent = `${price_adjustment.value}%`
          discount.amount = Math.round(
            (price * price_adjustment.value) / 100.0
          )
          break
        case 'fixed_amount':
          discount.percent = `${Math.round(
            ((price_adjustment.value * 1.0) / price) * 100.0
          )}%`
          discount.amount = price - price_adjustment.value
          break
        case 'price':
          discount.percent = `${Math.round(
            (((price - price_adjustment.value) * 1.0) /
              price) *
              100.0
          )}%`
          discount.amount = price - price_adjustment.value
          break
      }
      
      return discount

    } else {

      const price_adjustment = selling_plan.price_adjustments[0]
      const discount = { percent: '0%', amount: 0 }
      const price = this.selectedVariant.price;
      
      switch (price_adjustment.value_type) {
        case 'percentage':
          discount.percent = `${price_adjustment.value}%`
          discount.amount = Math.round(
            (price * price_adjustment.value) / 100.0
          )
          break
        case 'fixed_amount':
          discount.percent = `${Math.round(
            ((price_adjustment.value * 1.0) / price) * 100.0
          )}%`
          discount.amount = price_adjustment.value
          break
        case 'price':
          discount.percent = `${Math.round(
            (((price - price_adjustment.value) * 1.0) /
              price) *
              100.0
          )}%`
          discount.amount = price - price_adjustment.value
          break
      }
      
      return discount

    }
    
  }

  // Calculates the variant's price for the given selling plan, returns a formatted money value (if desired)
  price(selling_plan, formatted = true) {

    if (selling_plan.name.includes('prepaid')) {

      let option = selling_plan.options[0]['value'];
      var numberPattern = /\d+/g;
      let result = parseInt(option.match( numberPattern ).join(''));

      return formatted
        ? this.money( (this.selectedVariant.price * result) - this.discount(selling_plan).amount)
        :  (this.selectedVariant.price * result) - this.discount(selling_plan).amount

    } else {

      return formatted
        ? this.money( this.selectedVariant.price - this.discount(selling_plan).amount)
        :  this.selectedVariant.price - this.discount(selling_plan).amount

    }

    
  }

  // If a formId was passed, appends the necessary <input> elements to the form
  updateForm() {
    if (this.formId) {
      let form = document.querySelector(`#${this.formId}`);

      if (form) {
        let selling_plan_input = form.querySelector('[name="selling_plan"]');
        if (selling_plan_input) {
          selling_plan_input.value = this.selectedSellingPlan?.id !== undefined ? this.selectedSellingPlan?.id : null;
          selling_plan_input.disabled = this.selectedSellingPlan?.id !== undefined ? false : true;
          
        } else {
          selling_plan_input = document.createElement('input');
          selling_plan_input.type = "hidden";
          selling_plan_input.name = "selling_plan";
          selling_plan_input.value = this.selectedSellingPlan?.id !== undefined ? this.selectedSellingPlan?.id : null;
          selling_plan_input.disabled = this.selectedSellingPlan?.id !== undefined ? false : true;
          form.append(selling_plan_input);
        }

        let discountValue = this.selectedSellingPlan?.id !== undefined ? this.discount(this.selectedSellingPlan).percent : null;
        if (discountValue == '0%') discountValue = null;

        let discount_input = form.querySelector('[name="properties[Discount]"]');
        if (discount_input) {
          discount_input.value = this.selectedSellingPlan?.id !== undefined ? this.discount(this.selectedSellingPlan).percent : null;
          discount_input.disabled = this.selectedSellingPlan?.id !== undefined ? false : true;
          if (discountValue == null) discount_input.disabled = true;
        } else {
          discount_input = document.createElement('input');
          discount_input.type = "hidden";
          discount_input.name = "properties[Discount]";
          discount_input.value = this.selectedSellingPlan?.id !== undefined ? this.discount(this.selectedSellingPlan).percent : null;
          discount_input.disabled = this.selectedSellingPlan?.id !== undefined ? false : true;
          if (discountValue == null) discount_input.disabled = true;
          form.append(discount_input);
        }

      } else {
        console.log(`Skio error: form ID is ${ this.formId }, but no form with that ID was found.`);
      }
    }
  }

  addVariantClickEventListeners() {
    let variantInputs = document.querySelectorAll(this.variantInputSelector)
    let skio = this
    for (let el of variantInputs) {
      el.addEventListener('click', function(e) {
        // may need to replace with ID / e.target depending on client setup
        // may need to use different attribute depending on ^^
        let variantTitle = e.currentTarget.value
        skio.selectedVariant = skio.product.variants.find(variant => variant.title == variantTitle)
      })
    }
  }

  // Optional functions keep if necessary 

  /**
   *   
   * 
   */
  
  // Runs a fetch request to add the selectedVariant to the cart with the passed quantity and selectedSellingPlan
  addToCart(quantity = 1) {
    const items = [
      {
        id: this.selectedVariant.id,
        quantity: quantity,
        ...(this.selectedSellingPlan && { selling_plan: this.selectedSellingPlan?.id })
      }
    ];

    fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ items })
    })
    .then((response) => response.json())
    .then((response) => {
      this.log("SKIO added item to cart: ", response);
      //dispatch CustomEvent to tell document that an item was added to cart
      const event = new CustomEvent(`skio::added-to-cart`, {
        bubbles: true, 
        composed: true, 
        detail: {
          response,
          key: this.key
        }
      });

      this.dispatchEvent(event);
    })
    .catch((error) => {
      this.error(`SKIO ${ this.key } error adding item to cart: `, error);
    });
  } 

  fetchProduct = (handle) => {
    return fetch(`/products/${ handle }.js`)
    .then((response) => response.json())
    .then((product) => {
      this.product = product;
      this.selectedVariant = product.variants[0];

      return product;
    });
  }
}

customElements.define('skio-plan-picker', SkioPlanPickerComponent);
