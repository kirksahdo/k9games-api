/**
 * game controller
 */

import { factories } from "@strapi/strapi";
import game from "../routes/game";

export default factories.createCoreController(
  "api::game.game",
  ({ strapi }) => ({
    async populate(ctx) {
      await strapi.service("api::game.game").populate(ctx.query);
      ctx.send("FINALIZADO");
    },
  }),
);
