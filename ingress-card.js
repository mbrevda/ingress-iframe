function c(i){return typeof i!="string"?!1:i.includes("{{")||i.includes("{%")}function h(i){return typeof i!="string"?"":i.trim()}function g(i,t){if(/^https?:\/\//i.test(i)||i.startsWith("//"))return null;let e=i.replace(/^\/+/,""),[s,...n]=e.split("/"),r=n.length>0?`/${n.join("/")}`:"";if(t&&t[s]){let a=t[s]?.config?.addon;if(typeof a=="string"&&a.length>0)return{addonSlug:a,subpath:r}}return/^[a-zA-Z0-9]+_[a-zA-Z0-9_-]+$/.test(s)?{addonSlug:s,subpath:r}:null}var f=10*60*1e3,m="fullscreen; autoplay; clipboard-write; microphone; camera",_="allow-forms allow-modals allow-popups allow-pointer-lock allow-same-origin allow-scripts allow-downloads",b=typeof HTMLElement<"u"?HTMLElement:class{},l=class extends b{_config;_hass;_initialized=!1;_currentSrc=null;_unsubTemplate=null;_refreshInterval=null;constructor(){super(),typeof this.attachShadow=="function"&&this.attachShadow({mode:"open"})}setConfig(t){if(!t)throw new Error("Invalid configuration for ingress-card");this._config={...t},this._initialized&&this._hass&&this._init(this._hass)}set hass(t){this._hass=t,!this._initialized&&t&&this._config&&(this._initialized=!0,this._init(t))}disconnectedCallback(){this._unsubTemplate&&(this._unsubTemplate(),this._unsubTemplate=null),this._refreshInterval&&(clearInterval(this._refreshInterval),this._refreshInterval=null),this._initialized=!1}_init(t){this._unsubTemplate&&(this._unsubTemplate(),this._unsubTemplate=null);let e=h(this._config?.url??this._config?.addon??this._config?.panel??"");c(e)?t.connection.subscribeMessage(s=>{this._resolveAndLoad(s,t)},{template:e,type:"render_template"}).then(s=>{this._unsubTemplate=s}).catch(s=>{let n=s instanceof Error?s.message:String(s);this._showError(`Template render error: ${n}`)}):this._resolveAndLoad(e,t),this._refreshInterval||(this._refreshInterval=setInterval(()=>{this._refreshIngressSession()},f))}async _refreshIngressSession(){if(this._hass)try{await this._hass.callWS({endpoint:"/ingress/session",method:"post",type:"supervisor/api"})}catch{}}async _resolveAndLoad(t,e){if(!t){this._showError("No URL, addon, or panel specified.");return}let s=g(t,e.panels),n=t;if(s)try{await this._refreshIngressSession();let r=await e.callWS({endpoint:`/addons/${s.addonSlug}/info`,method:"get",type:"supervisor/api"});if(!r?.ingress_url){this._showError(`No Ingress endpoint available for addon '${s.addonSlug}'. Ensure the addon is started.`);return}n=`${r.ingress_url.replace(/\/+$/,"")}${s.subpath}`}catch(r){let o=r instanceof Error?r.message:String(r);this._showError(`Failed to establish Ingress session: ${o}`);return}this._currentSrc!==n&&(this._currentSrc=n,this._renderIframe(n))}_renderIframe(t){if(!this.shadowRoot)return;let e=this._config?.title,s=this._config?.height??"calc(100dvh - var(--header-height, 64px))",n=this._config?.aspect_ratio,r=!!n,o=r?`padding-top: ${n};`:"",d=this._config?.allow??m,a=this._config?.sandbox??_,u=e?`<h1 class="card-header">${e}</h1>`:"";this.shadowRoot.innerHTML=`
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
          height: ${r?"0":s};
          ${o}
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
        ${u}
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
    `)}getCardSize(){let t=this._config?.aspect_ratio,e=this._config?.title;if(t){let s=/^(\d+)%?$/.exec(t.trim()),n=s?Number(s[1]):50;return 1+Math.ceil(n/15)+(e?1:0)}return(this._config?.height?10:4)+(e?1:0)}getLayoutOptions(){return{grid_columns:this._config?.aspect_ratio?"auto":"full",grid_rows:"auto"}}};globalThis.customElements.get("ingress-card")||globalThis.customElements.define("ingress-card",l);var p=globalThis;p.customCards??=[];p.customCards.push({description:"Drop-in replacement for the Home Assistant Webpage/Iframe card that seamlessly supports Add-on Ingress and companion apps.",documentationURL:"https://github.com/mbrevda/lovelace-ingress-card",name:"Ingress Card",preview:!0,type:"ingress-card"});export{l as DynamicIngressCard};
