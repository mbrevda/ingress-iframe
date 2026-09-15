function c(n){return typeof n!="string"?!1:n.includes("{{")||n.includes("{%")}function h(n){return typeof n!="string"?"":n.trim()}function p(n,s){let i=n.replace(/^\/+/,""),[t,...e]=i.split("/"),r=e.length>0?`/${e.join("/")}`:"";if(/^[a-f0-9]+_[a-zA-Z0-9_-]+$/.test(t))return{addonSlug:t,subpath:r};if(s&&s[t]){let l=s[t]?.config?.addon;if(typeof l=="string"&&l.length>0)return{addonSlug:l,subpath:r}}return null}var f=10*60*1e3,g="fullscreen; autoplay; clipboard-write; microphone; camera",m="allow-forms allow-modals allow-popups allow-pointer-lock allow-same-origin allow-scripts allow-downloads",_=typeof HTMLElement<"u"?HTMLElement:class{},a=class extends _{_config;_hass;_initialized=!1;_currentSrc=null;_unsubTemplate=null;_refreshInterval=null;constructor(){super(),typeof this.attachShadow=="function"&&this.attachShadow({mode:"open"})}setConfig(s){if(!s)throw new Error("Invalid configuration for ingress-card");this._config={...s},this._initialized&&this._hass&&this._init(this._hass)}set hass(s){this._hass=s,!this._initialized&&s&&this._config&&(this._initialized=!0,this._init(s))}disconnectedCallback(){this._unsubTemplate&&(this._unsubTemplate(),this._unsubTemplate=null),this._refreshInterval&&(clearInterval(this._refreshInterval),this._refreshInterval=null),this._initialized=!1}_init(s){this._unsubTemplate&&(this._unsubTemplate(),this._unsubTemplate=null);let i=h(this._config?.url??this._config?.addon??this._config?.panel??"");c(i)?s.connection.subscribeMessage(t=>{this._resolveAndLoad(t,s)},{template:i,type:"render_template"}).then(t=>{this._unsubTemplate=t}).catch(t=>{let e=t instanceof Error?t.message:String(t);this._showError(`Template render error: ${e}`)}):this._resolveAndLoad(i,s),this._refreshInterval||(this._refreshInterval=setInterval(()=>{this._refreshIngressSession()},f))}async _refreshIngressSession(){if(this._hass)try{await this._hass.callWS({endpoint:"/ingress/session",method:"post",type:"supervisor/api"})}catch{}}async _resolveAndLoad(s,i){if(!s){this._showError("No URL, addon, or panel specified.");return}let t=p(s,i.panels),e=s;if(t)try{await this._refreshIngressSession();let r=await i.callWS({endpoint:`/addons/${t.addonSlug}/info`,method:"get",type:"supervisor/api"});if(!r?.ingress_url){this._showError(`No Ingress endpoint available for addon '${t.addonSlug}'. Ensure the addon is started.`);return}e=`${r.ingress_url.replace(/\/+$/,"")}${t.subpath}`}catch(r){let o=r instanceof Error?r.message:String(r);this._showError(`Failed to establish Ingress session: ${o}`);return}this._currentSrc!==e&&(this._currentSrc=e,this._renderIframe(e))}_renderIframe(s){if(!this.shadowRoot)return;let i=this._config?.height??"calc(100dvh - var(--header-height, 64px))",t=this._config?.aspect_ratio,e=!!t,r=e?`padding-bottom: ${t};`:"",o=this._config?.allow??g,d=this._config?.sandbox??m;this.shadowRoot.innerHTML=`
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        .container {
          position: relative;
          width: 100%;
          height: ${e?"0":i};
          ${r}
        }
        iframe {
          position: ${e?"absolute":"relative"};
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
      </style>
      <div class="container">
        <iframe
          src="${s}"
          allow="${o}"
          sandbox="${d}"
        ></iframe>
      </div>
    `}_showError(s){this.shadowRoot&&(this.shadowRoot.innerHTML=`
      <style>
        .error-card {
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
      <div class="error-card">
        <strong>Ingress Card Error:</strong> ${s}
      </div>
    `)}getCardSize(){return this._config?.aspect_ratio?4:10}getLayoutOptions(){return{grid_columns:this._config?.aspect_ratio?"auto":"full",grid_rows:"auto"}}};globalThis.customElements.get("ingress-card")||globalThis.customElements.define("ingress-card",a);var u=globalThis;u.customCards??=[];u.customCards.push({description:"Seamlessly embed Add-on Ingress interfaces or URLs in Lovelace with full mobile app support.",name:"Ingress Card",preview:!0,type:"ingress-card"});export{a as DynamicIngressCard};
