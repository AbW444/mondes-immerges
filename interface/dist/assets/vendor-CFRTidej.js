var l=Object.defineProperty;var c=(s,r,e)=>r in s?l(s,r,{enumerable:!0,configurable:!0,writable:!0,value:e}):s[r]=e;var i=(s,r,e)=>c(s,typeof r!="symbol"?r+"":r,e);let h=class extends HTMLElement{constructor(){super();i(this,"_propsToUpgrade",{});i(this,"shadow");i(this,"template");i(this,"defaultProps");i(this,"isAttached",!1);this.shadow=this.attachShadow({mode:"open"}),this.template=document.createElement("template")}storePropsToUpgrade(e){e.forEach(t=>{this.hasOwnProperty(t)&&this[t]!==void 0&&(this._propsToUpgrade[t]=this[t],delete this[t])})}upgradeStoredProps(){Object.entries(this._propsToUpgrade).forEach(([e,t])=>{this.setAttribute(e,t)})}reflect(e){e.forEach(t=>{Object.defineProperty(this,t,{set(n){"string,number".includes(typeof n)?this.setAttribute(t,n.toString()):this.removeAttribute(t)},get(){return this.getAttribute(t)}})})}applyDefaultProps(e){this.defaultProps=e,Object.entries(e).forEach(([t,n])=>{this[t]=this[t]||n.toString()})}};var o=":host{--uib-dot-size:calc(var(--uib-size)/2);align-items:center;display:inline-flex;flex-shrink:0;height:var(--uib-size);justify-content:center;width:var(--uib-size)}:host([hidden]){display:none}.container{align-items:center;animation:rotate calc(var(--uib-speed)*2) linear infinite;display:flex;height:calc(var(--uib-size)/2);justify-content:space-between;position:relative;width:var(--uib-size);will-change:transform}.svg{filter:url(#uib-jelly-ooze);overflow:visible}.dot{cy:50%;cx:50%;r:calc(var(--uib-dot-size)/2);fill:var(--uib-color);display:block;transform-box:fill-box;transform-origin:center;transition:fill .3s ease;will-change:transform}.dot:first-child{animation:shift-left var(--uib-speed) ease infinite}.dot:nth-child(2){animation:shift-right var(--uib-speed) ease infinite}@keyframes rotate{0%,49.999%,to{transform:none}50%,99.999%{transform:rotate(90deg)}}@keyframes shift-left{0%,to{transform:scale(1) translateX(0)}50%{transform:scale(.65) translateX(-75%)}}@keyframes shift-right{0%,to{transform:scale(1) translateX(0)}50%{transform:scale(.65) translateX(75%)}}";class a extends h{constructor(){super();i(this,"_attributes",["size","color","speed"]);i(this,"size");i(this,"color");i(this,"speed");this.storePropsToUpgrade(this._attributes),this.reflect(this._attributes)}static get observedAttributes(){return["size","color","speed"]}connectedCallback(){this.upgradeStoredProps(),this.applyDefaultProps({size:40,color:"black",speed:.9});const e=parseInt(this.size)/2;this.template.innerHTML=`
      <div
        class="container"
      >
        <svg 
          class="svg"         
          x="0px" 
          y="0px"
          viewBox="0 0 ${this.size} ${e}"
          height="${e}"
          width="${this.size}"
          preserveAspectRatio='xMidYMid meet'
        >
          <circle class="dot" />
          <circle class="dot" />
          <defs>
            <filter id="uib-jelly-ooze">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation=${parseInt(this.size)/8}
                result="blur"
              />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                result="ooze"
              />
              <feBlend in="SourceGraphic" in2="ooze" />
            </filter>
          </defs>
        </svg>  
      </div>
      <style>
        :host{
          --uib-size: ${this.size}px;
          --uib-color: ${this.color};
          --uib-speed: ${this.speed}s;
        }
        ${o}
      </style>
    `,this.shadow.replaceChildren(this.template.content.cloneNode(!0))}attributeChangedCallback(){const e=this.shadow.querySelector("style");e&&(e.innerHTML=`
      :host{
        --uib-size: ${this.size}px;
        --uib-color: ${this.color};
        --uib-speed: ${this.speed}s;
      }
      ${o}
    `)}}var u={register:(s="l-jelly")=>{customElements.get(s)||customElements.define(s,class extends a{})},element:a};export{u as i};
