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
      lede:
        "Finding friends and feeling their presence inside the headset. A People surface for Quest that makes social the front door, not a setting.",
      meta: [
        { k: "Role", v: "Product Design" },
        { k: "Platforms", v: "Mobile & VR apps" },
        { k: "Date", v: "2023–2025" },
      ],
      hero: { type: "video", src: "/images/quest-vr/people-tab.mp4", fit: "cover" },
      sections: [
        {
          kicker: "Presence",
          title: "Friends, front and center",
          body: "Who's online, what they're playing, and how to join, at a glance.",
          layout: "full",
          media: [{ type: "video", src: "/images/quest-vr/people-tab.mp4", alt: "Quest People tab", fit: "cover" }],
        },
        {
          kicker: "One account",
          title: "Sign in anywhere",
          body: "Meta Accounts across VR, desktop, tablet, and phone.",
          layout: "full",
          media: [{ type: "image", src: "/images/home/meta-accounts.png", alt: "Meta Accounts across devices", fit: "cover" }],
        },
      ],
    },
  },

  {
    id: "horizon-chat",
    title: "World Chat",
    product: "Horizon",
    era: "Meta",
    orientation: "landscape",
    feature: true,
    hover: "sweep",
    overlay: "dock",
    tile: { type: "video", src: "/images/home/World-Comms.tile.mp4", fit: "cover" },
    detail: {
      lede:
        "Horizon is Meta's social platform for VR. I led a small team to redesign in-world communication (text chat, voice, and emotes), including the in-game menu, and changed the default modality from voice to text.",
      meta: [
        { k: "Role", v: "Design lead · team of 3" },
        { k: "Platforms", v: "Mobile apps" },
        { k: "Date", v: "2025–2026" },
      ],
      hero: { type: "video", src: "/images/home/horizon-world-chat.mp4", fit: "cover" },
      sections: [
        {
          kicker: "The redesign",
          title: "Talking inside a world",
          body:
            "Communication in VR has to work while you're moving, playing, and present with others. We rebuilt text chat completely and made it the calm default.",
          layout: "full",
          media: [{ type: "video", src: "/images/home/horizon-world-chat.mp4", alt: "Horizon world chat", fit: "cover" }],
        },
        {
          kicker: "On the go",
          title: "Horizon, on mobile",
          body: "Bringing the world to the phone in your pocket.",
          layout: "full",
          media: [{ type: "video", src: "/images/home/horizon-mobile.mp4", alt: "Horizon mobile", fit: "contain" }],
        },
      ],
    },
  },

  {
    id: "horizon-mobile",
    title: "Gaming Profiles across Meta",
    product: "Meta",
    era: "Meta",
    orientation: "portrait",
    hover: "drift",
    overlay: "magazine",
    tile: { type: "video", src: "/images/home/Gaming-Profile.tile.mp4", fit: "cover" },
    detail: {
      lede:
        "The Horizon mobile experience. Discovering worlds, friends, and games on the phone, then jumping in.",
      meta: [
        { k: "Role", v: "Product Design" },
        { k: "Platforms", v: "Mobile apps" },
        { k: "Date", v: "2025–2026" },
      ],
      hero: { type: "video", src: "/images/home/horizon-mobile.mp4", fit: "cover" },
      sections: [
        {
          kicker: "Discovery",
          title: "Find a world, jump in",
          body: "Browsing and social, designed for the phone in your hand.",
          layout: "full",
          media: [{ type: "video", src: "/images/home/horizon-mobile.mp4", alt: "Horizon mobile", fit: "contain" }],
        },
      ],
    },
  },

  {
    id: "portal-voice",
    title: "Facebook on Portal",
    product: "Portal",
    era: "Meta",
    orientation: "portrait",
    hover: "bloom",
    overlay: "drop",
    tile: { type: "video", src: "/images/home/FB-Watch.tile.mp4", fit: "cover" },
    detail: {
      lede:
        "Portal brought Facebook to the living room. I designed and shipped the first versions of Facebook Watch and Facebook Live for TV — lean-back video and live broadcasting, built for a shared device on the couch.",
      meta: [
        { k: "Role", v: "Product Design" },
        { k: "Platforms", v: "Portal & TV apps" },
        { k: "Date", v: "2019–2021" },
      ],
      hero: { type: "video", src: "/images/portal/watch-tv-video-chaining.mp4", fit: "cover" },
      sections: [
        {
          kicker: "Watch",
          title: "Video made for the living room",
          body:
            "Facebook Watch on Portal — browsing shows at a distance, smart chaining between episodes, and a UI tuned for shared viewing on the couch.",
          layout: "full",
          media: [{ type: "video", src: "/images/portal/watch-tv-video-chaining.mp4", alt: "Facebook Watch on Portal", fit: "cover" }],
        },
        {
          kicker: "Live",
          title: "Go live from the couch",
          body:
            "Facebook Live on Portal let anyone broadcast to friends and groups from the device already in the room — no phone propped on a shelf.",
          layout: "grid2",
          media: [
            { type: "video", src: "/images/portal/fb-live.mp4", alt: "Facebook Live on Portal", fit: "cover" },
            { type: "image", src: "/images/portal/facebook-live.png", alt: "Facebook Live interface on Portal", fit: "cover" },
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
      bentoMedia: "showcase",
      bentoTiles: [
        {
          area: "left",
          media: {
            type: "image",
            src: "/images/portal/household-mode-specs.png",
            alt: "Household Mode animation specs",
            fit: "cover",
          },
        },
        {
          area: "right-top",
          media: {
            type: "image",
            src: "/images/portal/household-messaging.png",
            alt: "Household messaging contact card",
            fit: "cover",
          },
        },
        {
          area: "right-bottom",
          media: {
            type: "image",
            src: "/images/portal/marketing2.jpg",
            alt: "Portal in the living room",
            fit: "cover",
          },
        },
      ],
      lede:
        "Portal was Meta's video-calling device for the home. Household Mode let everyone in a home keep their own profile, contacts, and privacy on one shared device, switching between people without friction.",
      meta: [
        { k: "Role", v: "Product Design" },
        { k: "Platforms", v: "Portal & TV apps" },
        { k: "Date", v: "2019–2021" },
      ],
      hero: { type: "video", src: "/images/portal/household-mode-animation.mp4", fit: "cover" },
      sections: [
        {
          kicker: "The shape of it",
          title: "One device, many people",
          body:
            "A shared device needs a calm way to know who's using it. I designed the switch between people to feel personal and quick, never like a login screen.",
          layout: "full",
          media: [{ type: "video", src: "/images/portal/household-mode-animation.mp4", alt: "Household Mode profile switching", fit: "cover" }],
        },
        {
          kicker: "Verify instantly",
          title: "Access without signing in",
          body:
            "Household Mode pairs with voice and face verification so the device knows who's asking. You don't manually log in to reach your contacts and apps — biometrics verify you instantly and put your profile forward.",
          layout: "grid2",
          media: [
            { type: "video", src: "/images/home/portal-voice-recognition.mp4", alt: "Voice verification on Portal", fit: "cover" },
            { type: "video", src: "/images/portal/biometrics-voice.mp4", alt: "Voice and face biometrics on Portal", fit: "cover" },
          ],
        },
        {
          kicker: "Detail",
          title: "Spec'd for motion",
          body: "Motion specs handed to engineering, plus the shared messaging contact card.",
          layout: "grid2",
          media: [
            { type: "image", src: "/images/portal/household-mode-specs.png", alt: "Household Mode animation specs", fit: "cover" },
            { type: "image", src: "/images/portal/household-messaging.png", alt: "Household messaging contact card", fit: "cover" },
          ],
        },
        {
          kicker: "In context",
          title: "Built for the living room",
          body: "Portal in the wild. The product these flows lived inside.",
          layout: "grid3",
          media: [
            { type: "image", src: "/images/portal/marketing1.jpg", alt: "Portal", fit: "cover" },
            { type: "image", src: "/images/portal/marketing2.jpg", alt: "Portal", fit: "cover" },
            { type: "image", src: "/images/portal/marketing3.jpg", alt: "Portal", fit: "cover" },
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
