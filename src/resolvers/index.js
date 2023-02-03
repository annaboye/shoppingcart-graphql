const path = require("path");
const fsPromises = require("fs/promises");
const {
  fileExists,
  readJsonFile,
  deleteFile,
} = require("../utils/fileHandling");
const { GraphQLError, printType } = require("graphql");
const crypto = require("crypto");

const cartDirectory = path.join(__dirname, "..", "data", "shoppingcarts");
const productDirectory = path.join(__dirname, "..", "data", "products");

exports.resolvers = {
  Query: {
    getCartById: async (_, args) => {
      const cartId = args.cartId;
      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);

      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      const cartData = await readJsonFile(cartFilePath);

      return cartData;
    },
    getProductById: async (_, args) => {
      const productId = args.productId;
      const productFilePath = path.join(productDirectory, `${productId}.json`);
      const productExists = await fileExists(productFilePath);

      if (!productExists)
        return new GraphQLError("That product does not exist");

      const productData = await readJsonFile(productFilePath);
      return productData;
    },
  },
  Mutation: {
    addItemToCart: async (_, args) => {
      const { cartId, productId, quantity } = args;

      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      const cartData = await readJsonFile(cartFilePath);

      let itemInCartExist = false;

      for (let x of cartData.items) {
        if (x.id === productId) {
          x.quantity += quantity;
          itemInCartExist = true;
        }
      }

      if (!itemInCartExist) {
        const productFilePath = path.join(
          productDirectory,
          `${productId}.json`
        );

        const productExists = await fileExists(productFilePath);

        if (!productExists)
          return new GraphQLError("That product does not exist");

        const productData = await readJsonFile(productFilePath);

        const newCartItem = {
          id: productData.id,
          name: productData.name,
          price: productData.price,
          quantity: quantity,
        };

        cartData.items.push(newCartItem);
      }

      let sum = 0;
      for (let x of cartData.items) {
        sum += x.quantity * x.price;
      }

      cartData.totalprice = sum;

      await fsPromises.writeFile(cartFilePath, JSON.stringify(cartData));

      return cartData;
    },

    createCart: async () => {
      const newCart = {
        id: crypto.randomUUID(),
        items: [],
        totalprice: 0,
      };

      let filePath = path.join(
        __dirname,
        "..",
        "data",
        "shoppingcarts",
        `${newCart.id}.json`
      );

      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath);
        console.log(exists, newCart.id);

        if (exists) {
          newCart.id = crypto.randomUUID();
          filePath = path.join(cartDirectory, `${newCart.id}.json`);
        }

        idExists = exists;
      }

      await fsPromises.writeFile(filePath, JSON.stringify(newCart));

      return newCart;
    },

    removeItemFromCart: async (_, args) => {
      const { cartId, cartItemId } = args;

      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      const cartData = await readJsonFile(cartFilePath);

      let itemInCartExist = false;

      for (let i = 0; i < cartData.items.length; i++) {
        if (cartData.items[i].id === cartItemId) {
          cartData.items[i].quantity--;
          itemInCartExist = true;
          if (cartData.items[i].quantity === 0) {
            console.log(cartData.items[i].quantity);
            cartData.items.splice(i, 1);
          }
        }
      }

      if (!itemInCartExist) {
        return new GraphQLError("That product does not exist in this cart");
      }

      let sum = 0;
      for (let x of cartData.items) {
        sum += x.quantity * x.price;
      }

      cartData.totalprice = sum;

      await fsPromises.writeFile(cartFilePath, JSON.stringify(cartData));
      return cartData;
    },
    deleteItemFromCart: async (_, args) => {
      const { cartId, cartItemId } = args;

      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      const cartData = await readJsonFile(cartFilePath);

      let itemInCartExist = false;

      for (let i = 0; i < cartData.items.length; i++) {
        if (cartData.items[i].id === cartItemId) {
          itemInCartExist = true;
        }
      }

      if (!itemInCartExist)
        return new GraphQLError("That product does not exist in this cart");

      for (let i = 0; i < cartData.items.length; i++) {
        if (cartData.items[i].id === cartItemId) {
          cartData.items.splice(i, 1);
        }
      }

      let sum = 0;
      for (let x of cartData.items) {
        sum += x.quantity * x.price;
      }

      cartData.totalprice = sum;

      await fsPromises.writeFile(cartFilePath, JSON.stringify(cartData));
      return cartData;
    },

    deleteCart: async (_, args) => {
      const { cartId } = args;

      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);

      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      try {
        await deleteFile(cartFilePath);
      } catch (error) {
        return {
          deletedId: cartId,
          success: false,
        };
      }

      return {
        deletedId: cartId,
        success: true,
      };
    },
  },
};
