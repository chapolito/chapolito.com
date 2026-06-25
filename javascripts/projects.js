/* ------------------------------------------------------------------
   Curated work set (v2). One source of truth for every variation.

   - Trimmed to 7 (Wiki Game + Fanpics cut; quality bar).
   - `orientation` lets the grid place portrait phone clips in tall
     frames and landscape device clips in wide frames, so nothing gets
     upscaled into a blurry full-bleed.
   - `detail` drives BOTH the standalone project page and the in-page
     overlay reader (no duplicate content, no extra click).
------------------------------------------------------------------ */
window.PROJECTS = [
  {
    id: "quest-people",
    title: "Social VR",
    product: "Quest VR",
    era: "Meta",
    orientation: "landscape",
    hover: "depth",
    overlay: "split",
    tile: { type: "video", src: "/images/quest-vr/people-tab.mp4", fit: "cover", insetShadow: true },
    detail: {
      layout: "story",
      storyColumn: "992",
      lede:
        "Quests are the best-selling VR devices ever. My focus was helping people communicate and play together.",
      meta: [
        { k: "Project", brand: "meta", v: "Quest VR" },
        { k: "Role", v: "Product Designer" },
        { k: "Platforms", v: "VR OS" },
        { k: "Date", v: "2024–2025" },
      ],
      sections: [
        {
          title: "Navigator",
          intro:
            "In 2024, we redesigned the VR OS and created the Navigator: a single menu, accessible from anywhere, for apps, social, and settings.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/quest-vr/people-tab-loop.mp4",
                  alt: "Quest Navigator People tab with friends in VR",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/quest-vr/you-tab-loop.mp4",
                  alt: "Quest Navigator You tab with avatar and profile",
                  fit: "cover",
                },
              ],
            },
          ],
          body: [
            "I developed the initial direction on both the You and People tabs before handing off to senior designers to bring across the finish line.",
            "This required coordinating across multiple teams to bring in their highest value features. The challenge was integrating complex systems without bloating the feature set.",
          ],
        },
      ],
    },
  },

  {
    id: "horizon-chat",
    title: "In-game Communication",
    product: "Horizon",
    era: "Meta",
    orientation: "landscape",
    feature: true,
    hover: "sweep",
    overlay: "dock",
    tile: { type: "video", src: "/images/home/World-Comms.tile.mp4", fit: "cover" },
    detail: {
      layout: "story",
      storyColumn: "992",
      lede:
        "Horizon is Meta's social platform for VR. I led a small team to redesign in-world communication — text chat, voice, and emotes — including the in-game menu, and changed the default modality from voice to text.",
      meta: [
        { k: "Project", brand: "meta", v: "Horizon" },
        { k: "Role", v: "Design lead, guiding 3 designers" },
        { k: "Platforms", v: "Mobile & VR" },
        { k: "Date", v: "2025–2026" },
      ],
      sections: [
        {
          title: "Voice → Text",
          intro:
            "Communication in VR has to work while you're moving, playing, and present with others. We rebuilt text chat completely and made it the calm default.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/home/World-Comms.tile.mp4",
                  alt: "Horizon world chat on mobile",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/horizon/emotes-menu-vr.jpg",
                  alt: "Emotes menu in Horizon VR",
                  fit: "cover",
                },
                {
                  type: "video",
                  src: "/images/horizon/vr-concept-prototype.mp4",
                  alt: "VR concept prototype for in-world communication",
                  fit: "cover",
                  label: "Concept prototype",
                },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    id: "horizon-mobile",
    title: "Gaming Profiles across Meta",
    product: "Horizon",
    era: "Meta",
    orientation: "portrait",
    hover: "drift",
    overlay: "split",
    tile: { type: "video", src: "/images/home/Gaming-Profile.tile.mp4", fit: "cover" },
    detail: {
      layout: "story",
      storyColumn: "992",
      lede:
        "As Horizon expanded across Facebook and Instagram, we needed to define how gaming identity, profiles, and social connections would work across Meta.",
      meta: [
        { k: "Project", brand: "meta", v: "Horizon" },
        { k: "Role", v: "Design lead, guiding 5 designers" },
        { k: "Platforms", v: "Mobile" },
        { k: "Date", v: "2026" },
      ],
      hero: {
        type: "video",
        src: "/images/horizon/Gaming-Profile-hero-image.mp4",
        alt: "Horizon mobile app showing gaming profiles and friends activity",
        fit: "contain",
      },
      footnote: {
        lead: "This work is scheduled to ship in Summer 2026.",
        body:
          "I can share the full case study during a portfolio review, including how we defined a shared gaming profile across Meta, aligned teams around a unified vision, and designed the foundations for profiles across Facebook and Instagram.",
      },
    },
  },

  {
    id: "portal-voice",
    title: "Facebook on Portal",
    product: "Portal",
    era: "Meta",
    orientation: "portrait",
    hover: "bloom",
    overlay: "split",
    tile: { type: "video", src: "/images/home/FB-Watch.tile.mp4", fit: "cover" },
    detail: {
      layout: "story",
      storyColumn: "992",
      lede: "I designed two apps: Facebook Live and Facebook Watch for Portal devices.",
      meta: [
        { k: "Project", brand: "meta", v: "Portal" },
        { k: "Role", v: "Product Designer" },
        { k: "Platforms", v: "Portal & Portal TV" },
        { k: "Date", v: "2019–2020" },
      ],
      sections: [
        {
          title: "Facebook Live",
          intro:
            "Portal owners loved making video calls and the ease of hands-free calling with Smart Camera — the AI-powered camera that kept everyone on screen. We wanted to bring that magic to more experiences, like going live on Facebook.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Live-woman-on-portal.jpg",
                  alt: "Facebook Live on Portal with Smart Camera and live comments",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Watch-loading-screen.jpg",
                  alt: "Facebook Live splash screen on Portal",
                  fit: "cover",
                },
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Watch-prototype.jpg",
                  alt: "Start Live Video setup on Portal",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "full",
              media: [
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Live-TV.jpg",
                  alt: "Facebook Live on Portal TV with audience comments",
                  fit: "cover",
                },
              ],
            },
          ],
          body: [
            "Launched in early 2020, we immediately saw people using it to reach their audiences while sheltering in place. People were using Portals to broadcast sermons, share thoughts on pandemic job loss, and provide FAQs on social distancing.",
          ],
        },
        {
          title: "Facebook Watch",
          intro:
            "In addition to video calls and going live, people used their Portals to consume media. I adapted Facebook Watch so people could easily watch their favorite shows and videos from creators.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/portal/facebook-on-portal/FB-Watch-video-chaining.mp4",
                  alt: "Facebook Watch on Portal playing Red Table Talk",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Watch-tv-icon.jpg",
                  alt: "Facebook Watch app on Portal TV home screen",
                  fit: "cover",
                },
                {
                  type: "image",
                  src: "/images/portal/facebook-on-portal/FB-Watch-browse.jpg",
                  alt: "Facebook Watch browse experience on Portal",
                  fit: "cover",
                },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    id: "portal-household",
    title: "Household Mode",
    product: "Portal",
    era: "Meta",
    orientation: "landscape",
    feature: true,
    hover: "rise",
    overlay: "expand",
    tile: {
      type: "video",
      src: "/images/home/Householde-Mode.tile.mp4",
      fit: "cover",
      align: "top left"
    },
    detail: {
      layout: "story",
      storyColumn: "992",
      lede:
        "Household mode let parents restrict the contacts and apps anyone in the home could use on a shared Portal.",
      meta: [
        { k: "Project", brand: "meta", v: "Portal" },
        { k: "Role", v: "Product Designer" },
        { k: "Platforms", v: "Portal & Portal TV" },
        { k: "Date", v: "2021" },
      ],
      sections: [
        {
          intro:
            "The primary use case was for parents to set limits for kids — controlling who could be contacted and which apps were available on a device the whole family shared.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "video",
                  src: "/images/portal/household-mode/household-mode-animation.mp4",
                  alt: "Household Mode profile switching on Portal",
                  fit: "cover",
                  overlay: {
                    src: "/images/portal/household-mode/household-mode-specs.png",
                    alt: "Household mode animation specifications",
                  },
                },
              ],
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/portal/household-mode/Household-Mode-label.jpg",
                  alt: "Household mode label on Portal home screen",
                  fit: "cover",
                },
                {
                  type: "video",
                  src: "/images/portal/household-mode/Household-mode-is-on.mp4",
                  alt: "Household mode discovery on Portal",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "full",
              media: [
                {
                  type: "image",
                  src: "/images/portal/household-mode/Household-mode-discovery.jpg",
                  alt: "Household mode promo and app restriction settings on Portal",
                  fit: "cover",
                },
              ],
            },
          ],
        },
        {
          title: "Meta Accounts",
          intro:
            "Alongside household mode, I worked as part of a cross-Meta effort to launch the UI of Meta Accounts and was responsible for the Portal experience. Linking a Meta account and Facebook profile meant people could use one account to manage household mode.",
          mediaRows: [
            {
              layout: "full",
              media: [
                {
                  type: "image",
                  src: "/images/portal/meta-accounts/Meta-accounts-across-devices.jpg",
                  alt: "Meta Accounts setup across Portal, Quest, mobile, and desktop",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "double",
              media: [
                {
                  type: "image",
                  src: "/images/portal/meta-accounts/Meta-accounts-login.jpg",
                  alt: "Who's using Portal profile picker",
                  fit: "cover",
                },
                {
                  type: "video",
                  src: "/images/portal/meta-accounts/accounts-center-tv.mp4",
                  alt: "Accounts Center on Portal TV",
                  fit: "cover",
                },
              ],
            },
            {
              layout: "full",
              media: [
                {
                  type: "image",
                  src: "/images/portal/meta-accounts/Meta-accounts-setup-confirmation.jpg",
                  alt: "Meta account added confirmation on Portal",
                  fit: "cover",
                },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    id: "mk-play",
    title: "Playful by design",
    product: "Messenger Kids",
    era: "Meta",
    orientation: "portrait",
    feature: true,
    hover: "ghost",
    overlay: "pop",
    tile: { type: "video", src: "/images/messenger-kids/missed-call.mp4", fit: "cover" },
    detail: {
      lede:
        "Messenger Kids is a child's first messaging app, which means delight and safety in equal measure. I crafted the micro-interactions that make it feel alive without ever feeling unsafe.",
      meta: [
        { k: "Role", v: "Product Design" },
        { k: "Platforms", v: "Android, iOS, fireOS, & Web" },
        { k: "Date", v: "2017–2018" },
      ],
      hero: { type: "image", src: "/images/messenger-kids/hero-image.jpg", fit: "cover" },
      sections: [
        {
          kicker: "Moments",
          title: "Small motions, big personality",
          body: "A set of interactions that reward kids for showing up, without dark patterns.",
          layout: "grid2",
          media: [
            { type: "video", src: "/images/messenger-kids/GIF-button.mp4", alt: "GIF button", fit: "contain" },
            { type: "video", src: "/images/messenger-kids/get-started-button.mp4", alt: "Get started button", fit: "contain" },
            { type: "video", src: "/images/messenger-kids/inbox-tile.mp4", alt: "Inbox tile", fit: "contain" },
            { type: "video", src: "/images/messenger-kids/add-button.mp4", alt: "Add button", fit: "contain" },
          ],
        },
        {
          kicker: "A call you missed",
          title: "Even a missed call is friendly",
          body:
            "Kids don't always have their devices charged, on, or available — which led to a lot of missed calls. We built a digital version of the answering machine so they could leave a warm message when no one picked up.",
          layout: "full",
          media: [{ type: "video", src: "/images/messenger-kids/missed-call.mp4", alt: "Missed call", fit: "contain" }],
        },
        {
          kicker: "Identity",
          title: "Logo",
          body:
            "Designing the logo was only a couple weeks of the 2+ years I worked on Messenger Kids, but one of the most visible and lasting designs.",
          layout: "full",
          media: [{ type: "image", src: "/images/messenger-kids/mk-splatter.png", alt: "Messenger Kids logo", fit: "contain" }],
        },
      ],
    },
  },

  {
    id: "life360-messaging",
    title: "Family Messaging",
    product: "Life360",
    era: "Earlier",
    orientation: "portrait",
    hover: "iris",
    overlay: "float",
    tile: { type: "video", src: "/images/life360/closing-the-loop.mp4", fit: "cover" },
    detail: {
      lede:
        "At Life360 I designed family messaging and a delightful weather layer, closing the loop on 'where is everyone and are they okay?'",
      meta: [
        { k: "Role", v: "Product Design" },
        { k: "Platforms", v: "Android & iOS" },
        { k: "Date", v: "2016" },
      ],
      hero: { type: "video", src: "/images/life360/closing-the-loop.mp4", fit: "contain" },
      sections: [
        {
          kicker: "Messaging",
          title: "Quick, warm, glanceable",
          body: "Stickers and quick messages tuned for families on the move.",
          layout: "grid2",
          media: [
            { type: "image", src: "/images/life360/messaging-stickers.jpg", alt: "Life360 stickers", fit: "cover" },
            { type: "image", src: "/images/life360/quick-messages.jpg", alt: "Life360 quick messages", fit: "cover" },
          ],
        },
        {
          kicker: "Weather",
          title: "A little delight",
          body: "A weather layer that made checking in feel human.",
          layout: "grid2",
          media: [
            { type: "image", src: "/images/life360/weather-android-ui.png", alt: "Life360 weather UI", fit: "cover" },
            { type: "image", src: "/images/life360/weather-tooltip.png", alt: "Life360 weather tooltip", fit: "cover" },
          ],
        },
      ],
    },
  },
];
