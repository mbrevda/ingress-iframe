function c(o){return typeof o!="string"?!1:o.includes("{{")||o.includes("{%")}function h(o){return typeof o!="string"?"":o.trim()}function p(o,t){if(/^https?:\/\//i.test(o)||o.startsWith("//"))return null;let s=o.replace(/^\/+/,""),[e,...r]=s.split("/"),i=r.length>0?`/${r.join("/")}`:"";if(t&&t[e]){let a=t[e]?.config?.addon;if(typeof a=="string"&&a.length>0)return{addonSlug:a,subpath:i}}return/^[a-zA-Z0-9]+_[a-zA-Z0-9_-]+$/.test(e)?{addonSlug:e,subpath:i}:null}var g=10*60*1e3,m="fullscreen; autoplay; clipboard-write; microphone; camera",_="allow-forms allow-modals allow-popups allow-pointer-lock allow-same-origin allow-scripts allow-downloads",b=typeof HTMLElement<"u"?HTMLElement:class{},l=class extends b{_config;_hass;_initialized=!1;_currentSrc=null;_unsubTemplate=null;_refreshInterval=null;constructor(){super(),typeof this.attachShadow=="function"&&this.attachShadow({mode:"open"})}setConfig(t){if(!t)throw new Error("Invalid configuration for ingress-card");this._config={...t},this._initialized&&this._hass&&this._init(this._hass)}set hass(t){this._hass=t,!this._initialized&&t&&this._config&&(this._initialized=!0,this._init(t))}disconnectedCallback(){this._unsubTemplate&&(this._unsubTemplate(),this._unsubTemplate=null),this._refreshInterval&&(clearInterval(this._refreshInterval),this._refreshInterval=null),this._initialized=!1}_init(t){this._unsubTemplate&&(this._unsubTemplate(),this._unsubTemplate=null);let s=h(this._config?.url??this._config?.addon??this._config?.panel??"");c(s)?t.connection.subscribeMessage(e=>{this._resolveAndLoad(e,t)},{template:s,type:"render_template"}).then(e=>{this._unsubTemplate=e}).catch(e=>{let r=e instanceof Error?e.message:String(e);this._showError(`Template render error: ${r}`)}):this._resolveAndLoad(s,t),this._refreshInterval||(this._refreshInterval=setInterval(()=>{this._refreshIngressSession()},g))}async _refreshIngressSession(){if(this._hass)try{await this._hass.callWS({endpoint:"/ingress/session",method:"post",type:"supervisor/api"})}catch{}}async _resolveAndLoad(t,s){if(!t){this._showError("No URL, addon, or panel specified.");return}let e=p(t,s.panels),r=t;if(e)try{await this._refreshIngressSession();let i=await s.callWS({endpoint:`/addons/${e.addonSlug}/info`,method:"get",type:"supervisor/api"});if(!i?.ingress_url){this._showError(`No Ingress endpoint available for addon '${e.addonSlug}'. Ensure the addon is started.`);return}r=`${i.ingress_url.replace(/\/+$/,"")}${e.subpath}`}catch(i){let n=i instanceof Error?i.message:String(i);this._showError(`Failed to establish Ingress session: ${n}`);return}this._currentSrc!==r&&(this._currentSrc=r,this._renderIframe(r))}_renderIframe(t){if(!this.shadowRoot)return;let s=this._config?.title,e=this._config?.height??"calc(100dvh - var(--header-height, 64px))",r=this._config?.aspect_ratio,i=!!r,n=i?`padding-top: ${r};`:"",d=this._config?.allow??m,a=this._config?.sandbox??_,f=s?`<h1 class="card-header">${s}</h1>`:"";this.shadowRoot.innerHTML=`
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        ha-card {
          overflow: hidden;
          height: 100%;
          width: 100%;
          box-sizing: border-box;
        }
        .card-header {
          color: var(--ha-card-header-color, --primary-text-color);
          font-family: var(--ha-card-header-font-family, inherit);
          font-size: var(--ha-card-header-font-size, 24px);
          font-weight: normal;
          margin-block-start: 0;
          margin-block-end: 0;
          padding: 16px 16px 8px;
        }
        #root {
          position: relative;
          width: 100%;
          height: ${i?"0":e};
          ${n}
        }
        iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
      </style>
      <ha-card>
        ${f}
        <div id="root">
          <iframe
            src="${t}"
            allow="${d}"
            sandbox="${a}"
          ></iframe>
        </div>
      </ha-card>
    `}_showError(t){this.shadowRoot&&(this.shadowRoot.innerHTML=`
      <style>
        ha-card {
          padding: 16px;
          color: var(--error-color, #db4437);
          background-color: var(--card-background-color, #fff);
          border-radius: var(--ha-card-border-radius, 12px);
          border: 1px solid var(--error-color, #db4437);
          font-family: var(--primary-font-family, inherit);
          font-size: 14px;
          line-height: 1.5;
        }
      </style>
      <ha-card>
        <strong>Ingress Card Error:</strong> ${t}
      </ha-card>
    `)}getCardSize(){let t=this._config?.aspect_ratio,s=this._config?.title;if(t){let e=/^(\d+)%?$/.exec(t.trim()),r=e?Number(e[1]):50;return 1+Math.ceil(r/15)+(s?1:0)}return(this._config?.height?10:4)+(s?1:0)}getLayoutOptions(){return{grid_columns:this._config?.aspect_ratio?"auto":"full",grid_rows:"auto"}}};globalThis.customElements.get("ingress-card")||globalThis.customElements.define("ingress-card",l);var u=globalThis;u.customCards??=[];u.customCards.push({description:"Drop-in replacement for the Home Assistant Webpage/Iframe card that seamlessly supports Add-on Ingress and companion apps.",documentationURL:"https://github.com/mbrevda/lovelace-ingress-card",name:"Ingress Card",preview:!0,type:"ingress-card"});export{l as DynamicIngressCard};
